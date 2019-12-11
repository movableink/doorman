const url = require("url");
const cloneModule = require("../clone_module");
const log = require("../log");

exports.setup = function(everyauth, config) {
  if (config.modules.google) {
    var requiredDomain = config.modules.google.requiredDomain;
    if (requiredDomain && !requiredDomain.push) {
      requiredDomain = [requiredDomain];
    }

    var requiredEmail = config.modules.google.requiredEmail;
    if (requiredEmail && !requiredEmail.push) {
      requiredEmail = [requiredEmail];
    }

    if (!requiredEmail && !requiredDomain) {
      log.error({
        module: "Google",
        error: {
          type: "config",
          message: "must specify either requiredEmail or requiredDomain"
        }
      });
      process.exit(1);
    }
  }

  const checkDomain = function(auth) {
    let email = auth.google.user.email.split("@");

    for (let i = 0; i < requiredDomain.length; i++) {
      if (email.length == 2 && email[1] == requiredDomain[i]) {
        return true;
      }
    }

    log.info({
      module: "Google",
      message: "User rejected because email isn't in the list",
      domains: requiredDomain,
      email
    });

    return false;
  };

  const checkEmail = function(auth) {
    let email = auth.google.user.email;
    if (requiredEmail.indexOf(email) >= 0) {
      return true;
    }

    log.info({
      module: "Google",
      message:
        "User rejected because email isn't in the list of allowed addresses",
      email
    });

    return false;
  };

  const google = cloneModule("google");
  google
    .myHostname(config.hostname)
    .appId(config.modules.google.appId)
    .appSecret(config.modules.google.appSecret)
    .scope("https://www.googleapis.com/auth/userinfo.email")
    .authQueryParam({ access_type: "online", approval_prompt: "auto" })
    .findOrCreateUser(function(
      sess,
      accessToken,
      accessTokenExtra,
      googleUser
    ) {
      return googleUser;
    })
    .handleAuthCallbackError(function(req, res) {
      let parsedUrl = url.parse(req.url, true);
      req.flash(
        "error",
        "Error authenticating with Google: " + parsedUrl.query.error
      );
      res.redirectTo("/");
    })
    .addToSession(function(session, user, errors) {
      if (user) {
        session.auth = { google: user };
      }
    })
    .convertErr(function(data) {
      if (data.data) {
        return new Error(data.data.match(/H1>(.+)<\/H1/)[1]);
      } else if (data.error && data.error.message) {
        return new Error(data.error.message, data.error);
      } else {
        return new Error(JSON.stringify(data));
      }
    })
    .redirectPath("/");

  google.authorize = function(auth) {
    if (requiredEmail) {
      if (!checkEmail(auth)) {
        return false;
      }
    }
    if (requiredDomain) {
      if (!checkDomain(auth)) {
        return false;
      }
    }

    return true;
  };
  google.title = "Google";

  if (requiredDomain) {
    log.warn({
      module: "Google",
      message: "Registered authentication for domain members",
      domain: config.domain,
      domains: requiredDomain
    });
  }
  if (requiredEmail) {
    log.warn({
      module: "Google",
      message: "Registered authentication for users",
      domain: config.domain,
      users: requiredEmail
    });
  }

  return google;
};
