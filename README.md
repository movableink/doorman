DOORMAN
=======

Doorman is an http proxy that authenticates via OAuth.

Your organization probably has some internal services that need to be
password-protected.  You likely also already manage users using an external
service. (Github, Google Apps, etc)  Wouldn't it be nice if you could
delegate your internal app's authentication/authorization to that app?

![Screenshot](http://cl.ly/253L0I1S2i190X3m1M1Q/Image%202012.01.15%204:15:52%20AM.png)

Requirements
------------

 * node.js >= 10.12

Installation
------------

  * `yarn install`
  * copy config/app.js.example to config/app.js and modify
  * copy config/domains/default.js.example to config/domains/default.js and modify
  * `yarn start`

Strategies
----------

Doorman uses [everyauth](https://github.com/bnoguchi/everyauth) for authenticating,
so it supports a wide variety of providers for authentication.  For authorization,
we need to determine which authenticated users to let in. (see `lib/modules`) So
far only the Github, Google Apps, and Password modules are complete, but others are
fairly easy to add.


Multiple Domains
----------------

Doorman supports running a single instance for multiple domains.  It is organized
similar to Apache's virtualhosts; doorman will scan all domains found in
config/domains/*.js. The 'default' domain is special; it is a catch-all for when
none of the other domains are matched.  If you only have one service behind doorman
you can just use the 'default' domain.

HTTPS
-----

Doorman uses Let's Encrypt to secure its domains with TLS.  Certificates are obtained and renewed automatically. 
Acknowledgements
----------------

Doorman is pretty much just everyauth (https://github.com/bnoguchi/everyauth) and
node-http-proxy (https://github.com/nodejitsu/node-http-proxy) grafted together,
and those two projects do most of the heavy lifting.


Changelog
---------

#### master

  * [breaking] : configuration file moved from conf.js to config/app.js; backend
    configuration split out into config/domains/*.js
  * Multi-domain support added.

#### 0.4.1
  * bump http-proxy version to fix #32 (AlexRRR)

#### 0.4.0
  * _breaking_: simplify session cookie config. (see conf.example.js) (kcrayon)
  * pass config file as a second argument (kcrayon)
  * google auth only prompts user when necessary (kuahyeow)
  * reduce github permissions to minimum necessary (dwradcliffe)
  * https support (AndrewJo)
  * conf.environment.js config for using environment variables (pataquets)
  * replace winston logging with stdout/stderr

#### 0.3.0

  * `requiredEmail` option for github and google modules
  * `requiredDomain` and `requiredOrganization` options can be arrays
  * /_doorman/logout route
  * Upgrade everyauth to 0.4.9 (#18)

License
-------

Licensed under the MIT License. See LICENSE.
