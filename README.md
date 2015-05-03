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

 * node.js >= 0.8.x


Installation
------------

  * `npm install`
  * copy conf.example.js to conf.js and modify
  * `npm start`


Strategies
----------

Doorman uses [everyauth](https://github.com/bnoguchi/everyauth) for authenticating,
so it supports a wide variety of providers for authentication.  For authorization,
we need to determine which authenticated users to let in. (see `lib/modules`) So
far only the Github and Google modules are complete, but others are fairly easy.


Acknowledgements
----------------

Doorman is pretty much just everyauth (https://github.com/bnoguchi/everyauth) and
node-http-proxy (https://github.com/nodejitsu/node-http-proxy) grafted together,
and those two projects do most of the heavy lifting.


Changelog
---------

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
