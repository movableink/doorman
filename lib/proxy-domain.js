const session = require('cookie-session');
const cookieParser = require('cookie-parser');
const HttpProxy = require('./proxy');
const Router = require('express').Router;
const passport = require('passport');
const rp = require('request-promise-native');
const LocalStrategy = require('passport-local-token').Strategy;
const GitHubStrategy = require('passport-github').Strategy;
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

const verifyEmailDomain = (valids, profile) => {
  let emailDomains = profile.emails.map(e => e.value.split('@')[1])
  return valids.some(domain => emailDomains.some(emailDomain => domain == emailDomain))
}

const verifyEmail = (valids, profile) => {
  let emails = profile.emails.map(e => e.value);
  return valids.some(validEmail => emails.some(email => email == validEmail))
}

const verifyGitHubOrganization = (valids, profile) => {
  let orgs = profile.organizations
  return valids.some(validOrg => orgs.some(org => validOrg == org))
}

class ProxyDomain {
  constructor(options) {
    this.options = options;
    this.forwarder = new HttpProxy(
      options.proxyTo.host,
      options.proxyTo.port,
      options.proxyTo.ssl,
      options.proxyTo.ssl_insecure
    ).middleware();
    this.sessions = session(this.sessionOptions());
    this.cookies = cookieParser(this.options.sessionSecret);
    this.setup();
  }

  setupGoogleAuthentication() {
    let config = this.options.modules.google;

    let authorizedDomains = config.requiredDomain;
    if (authorizedDomains && !Array.isArray(authorizedDomains)) {
      authorizedDomains = [authorizedDomains]
    }
    let authorizedEmails = config.requiredEmail;
    if (authorizedEmails && !Array.isArray(authorizedEmails)) {
      authorizedEmails = [authorizedEmails]
    }
    if (!authorizedEmails && !authorizedDomains) {
      console.error("Config must specify either requiredEmail or requiredDomain.");
      process.exit(1);
    }

    if (authorizedDomains) {
      console.log(this.options.domain + " registered Google authentication for members of domains: " + authorizedDomains.join(", "));
    }
    if (authorizedEmails) {
      console.log(this.options.domain + " registered Google authentication for users: " + authorizedEmails.join(", "));
    }

    let protocol = this.isSecure() ? 'https://' : 'http://'
    passport.use(
      `${this.options.domain}-google`,
      new GoogleStrategy({
        clientID: config.appId,
        clientSecret: config.appSecret,
        callbackURL: `${protocol}${this.options.domain}/auth/google/callback`
      }, (accessToken, refreshToken, profile, done) => {
        let unauthorizedMessage = 'Sorry, this account is not allowed to access this resource'
        // determine if the person being authenticated is in the allowed list of emails
        if (authorizedEmails) {
          if (!verifyEmail(authorizedEmails, profile)) {
            console.log(`User rejected because none of their emails "${profile.emails.map(e => e.value)}" are not allowed: ${authorizedEmails.join(", ")}`);
            return done(null, false, { message: unauthorizedMessage })
          }
        }
        // determine if the person being authenticated is in the allowed list of domains
        if (authorizedDomains) {
          if (!verifyEmailDomain(authorizedDomains, profile)) {
            console.log(`User rejected because their email domains "${profile.emails.map(e => e.value)}" are not allowed: ${authorizedDomains.join(", ")}`);
            return done(null, false, { message: unauthorizedMessage })
          }
        }
        return done(null, { google: { id: profile.id } })
      })
    )
  }

  setupPasswordAuthentication() {
    let config = this.options.modules.password
    console.log(this.options.domain + " registered Password authentication");
    passport.use(
      `${this.options.domain}-local`,
      new LocalStrategy({ tokenField: 'password' },
      function(token, cb) {
        if (config.token && (config.token == token)) {
          console.log('Authenticated with password login');
          return cb(null, { password: { authenticated: true } });
        } else {
          console.log('Incorrect password for password login');
          return cb(null, false, { message : 'Sorry, the password was not correct.' });
        }
      }
    ));
  }

  setupGitHubAuthentication() {
    let config = this.options.modules.github;

    let authorizedOrganizations = config.requiredOrganization;
    if (authorizedOrganizations && !Array.isArray(authorizedOrganizations)) {
      authorizedOrganizations = [authorizedOrganizations]
    }
    let authorizedEmails = config.requiredEmail;
    if (authorizedEmails && !Array.isArray(authorizedEmails)) {
      authorizedEmails = [authorizedEmails]
    }
    if (!authorizedEmails && !authorizedOrganizations) {
      console.error("Config must specify either requiredEmail or requiredOrganization.");
      process.exit(1);
    }

    if (authorizedOrganizations) {
      console.log(this.options.domain + " registered GitHub authentication for members of organizations: " + authorizedOrganizations.join(", "));
    }
    if (authorizedEmails) {
      console.log(this.options.domain + " registered GitHub authentication for users: " + authorizedEmails.join(", "));
    }

    let protocol = this.isSecure() ? 'https://' : 'http://'
    passport.use(
      `${this.options.domain}-github`,
      new GitHubStrategy({
        clientID: config.appId,
        clientSecret: config.appSecret,
        callbackURL: `${protocol}${this.options.domain}${config.callbackPath}`
      },
      async function(accessToken, refreshToken, profile, done) {
        try {
          let organizations = await rp({
            json: true,
            url: 'https://api.github.com/user/orgs',
            headers: {
              Authorization: `token ${accessToken}`,
              'User-Agent': 'Doorman'
            },
          })
          profile.organizations = organizations.map(org => org.login)
        } catch (err) {
          return done(err);
        }

        let unauthorizedMessage = 'Sorry, this account is not allowed to access this resource'
        // determine if the person being authenticated is in the allowed list of emails
        if (authorizedEmails) {
          if (!verifyEmail(authorizedEmails, profile)) {
            console.log(`User rejected because "${profile.emails.map(e => e.value)}" isn't included in the list of emails: ${authorizedEmails.join(", ")}`);
            return done(null, false, { message: unauthorizedMessage })
          }
        }
        // determine if the person being authenticated is in the allowed list of domains
        if (authorizedOrganizations) {
          if (!verifyGitHubOrganization(authorizedOrganizations, profile)) {
            console.log("User rejected because they aren't in the organization list: " + authorizedOrganizations.join(", "));
            return done(null, false, { message: unauthorizedMessage })
          }
        }
        return done(null, { github: { id: profile.id } })
      }
    ));
  }

  setup() {
    this.enabled = {}

    if (this.options.modules.github) {
      let config = this.options.modules.github
      this.enabled.github = { _entryPath: config.entryPath }
      this.setupGitHubAuthentication()
    }

    if (this.options.modules.google) {
      this.enabled.google = { _entryPath: '/oauth/google' }
      this.setupGoogleAuthentication();
    }

    if (this.options.modules.password) {
      this.enabled.password = { _entryPath: '/_doorman/login' }
      this.setupPasswordAuthentication();
    }
  }

  authenticate(req, res, next) {
    let router = new Router()

    if (this.options.modules.google) {
      let config = this.options.modules.google;
      router.get(
        '/oauth/google',
        passport.authenticate(
          `${this.options.domain}-google`,
          { scope: 'https://www.googleapis.com/auth/userinfo.email' }
        )
      )
      router.get(
        '/auth/google/callback',
        passport.authenticate(
          `${this.options.domain}-google`,
          {
            successRedirect: '/',
            failureRedirect: '/',
            failureFlash: true,
          },
        )
      )
    }

    if (this.options.modules.github) {
      let config = this.options.modules.github
      router.get(
        config.entryPath,
        passport.authenticate(
          `${this.options.domain}-github`,
          { scope: 'user:email,read:org' }
        )
      )
      router.get(
        config.callbackPath,
        passport.authenticate(
          `${this.options.domain}-github`,
          {
            successRedirect: '/',
            failureRedirect: '/',
            failureFlash: true,
          },
        )
      )
    }

    if (this.options.modules.password) {
      router.get('/_doorman/login', (req, res) => {
        res.render('password_login.pug')
      })
      router.post(
        '/_doorman/login',
        passport.authenticate(
          `${this.options.domain}-local`,
          {
            successRedirect: '/',
            failureRedirect: '/',
            failureFlash: true,
          },
        ),
      )
    }

    router(req, res, next);
  }

  upgrade(req, socket, head) {
    this.sessions(req, new http.ServerResponse(req), () => {
      if (this.isAuthenticated(req)) {
        this.forwarder.proxyWebSocketRequest(req, socket, head);
      } else {
        socket.destroy();
      }
    })
  }

  isAuthenticated(req) {
    return req.user != null
  }

  isSecure() {
    return this.options.forceTLS && this.options.securePort && !req.secure
  }

  tls(req, res, next) {
    if (this.isSecure()) {
      let redirectPath = ['https://', req.hostname];
      redirectPath.push(req.url);
      return res.redirect(301, redirectPath.join(''));
    }
    next();
  }

  forward(req, res, next) {
    // /_doorman requests never get proxied
    if (req.url.startsWith('/_doorman')) {
      return next();
    }

    if (this.isAuthenticated(req) || this.isPublicPath(req)) {
      return this.forwarder(req, res, next);
    }

    return next();
  }

  isPublicPath(req) {
    if (!this.options.publicPaths) {
      return false;
    }

    for (let path of this.options.publicPaths) {
      // handle regex public paths
      if (typeof path === 'object') {
        if (req.url.match(path)) {
          return true;
        }
      } else {
        if (req.url.startsWith(path)) {
          return true;
        }
      }
    }

    return false;
  }

  sessionOptions() {
    return this.options.sessionCookie || {
      maxage: this.options.sessionCookieMaxAge,
      domain: this.options.sessionCookieDomain,
      secureProxy: this.options.sessionSecureProxy,
      secret: this.options.sessionSecret,
      name: '__doorman',
    };
  }
}

module.exports = ProxyDomain
