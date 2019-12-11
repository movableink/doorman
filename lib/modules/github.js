const { URL } = require("url");
const cloneModule = require("../clone_module");
const log = require("../log");

exports.setup = function(everyauth, config) {
  if (config.modules.github) {
    var requiredOrganization = config.modules.github.requiredOrganization;
    if (requiredOrganization && !requiredOrganization.push) {
      requiredOrganization = [requiredOrganization];
    }

    var requiredEmail = config.modules.github.requiredEmail;
    if (requiredEmail && !requiredEmail.push) {
      requiredEmail = [requiredEmail];
    }

    if (!requiredEmail && !requiredOrganization) {
      log.error({
        module: "Github",
        error: {
          type: "config",
          message: "must specify either requiredEmail or requiredOrganization"
        }
      });
      throw new Error("Github config must specify requiredEmail or requiredOrganization");
    }
  }

  const checkOrganization = function(auth) {
    let organizations = auth.github.user.organizations;

    for (let i = 0; i < requiredOrganization.length; i++) {
      for (let j = 0; j < organizations.length; j++) {
        let organization = organizations[j];
        if (organization.login == requiredOrganization[i]) {
          return true;
        }
      }
    }

    log.info({
      module: "Github",
      message: "User rejected because they aren't in the organization list",
      organizations: requiredOrganization
    });

    return false;
  };

  const checkEmail = function(auth) {
    let email = auth.github.user.email;
    if (requiredEmail.indexOf(email) >= 0) {
      return true;
    }

    log.info({
      module: "Github",
      message: "User rejected because email isn't in the list of allowed addresses",
      email
    });

    return false;
  };

  const github = cloneModule("github");
  github
    .myHostname(config.hostname)
    .appId(config.modules.github.appId)
    .appSecret(config.modules.github.appSecret)
    .scope("user:email,read:org")
    .callbackPath(config.modules.github.callbackPath)
    .entryPath(config.modules.github.entryPath)
    .findOrCreateUser(function(sess, accessToken, accessTokenExtra, ghUser) {
      let p = this.Promise();
      this.oauth.get(`${this.apiHost()}/user/orgs`, accessToken, function(err, data) {
        if (err) return p.fail(err);
        ghUser.organizations = [];
        let organizations = JSON.parse(data);
        for (let i = 0; i < organizations.length; i++) {
          ghUser.organizations.push({ login: organizations[i].login });
        }
        p.fulfill(ghUser);
      });
      return p;
    })
    .authCallbackDidErr(function(req) {
      const parsedUrl = new URL(req.url, `${req.protocol}://${req.host}`);
      return parsedUrl.query && !!parsedUrl.query.error;
    })
    .handleAuthCallbackError(function(req, res) {
      const parsedUrl = new URL(req.url, `${req.protocol}://${req.host}`);
      req.flash("error", `Error authenticating with Github: ${parsedUrl.query.error}`);
      res.redirectTo("/");
    })
    .redirectPath("/");

  github.authorize = function(auth) {
    if (requiredOrganization) {
      if (!checkOrganization(auth)) {
        return false;
      }
    }
    if (requiredEmail) {
      if (!checkEmail(auth)) {
        return false;
      }
    }

    return true;
  };
  github.title = "Github";
  github.domain = config.domain;

  if (requiredOrganization) {
    log.warn({
      module: "Github",
      message: "Registered authentication for members of organizations",
      domain: config.domain,
      organizations: requiredOrganization
    });
  }
  if (requiredEmail) {
    log.warn({
      module: "Github",
      message: "Registered authentication for users",
      domain: config.domain,
      users: requiredEmail
    });
  }

  return github;
};
