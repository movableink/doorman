module.exports = {
  // port to listen on
  port: 8085,

  proxyTo: {
    host: 'localhost',
    port: 8080
  },

  sessionSecret: 'AeV8Thaieel0Oor6shainu6OUfoh3ohwZaemohC0Ahn3guowieth2eiCkohhohG4', // change me

  // Needs a trailing slash
  logDir: '/var/log/doorman/',
  logFilename: 'doorman.log',

  modules: {
    // Register a new oauth app on Github at
    // https://github.com/account/applications/new
    github: {
      appId: 'YOUR-GITHUB-APP-ID',
      appSecret: 'YOUR-GITHUB-APP-SECRET',
      requiredOrganization: 'YOUR-ORGANIZATION-NAME' // short organization name
    },

    // Register a new oauth app on Google Apps at
    // https://code.google.com/apis/console
    google: {
      appId: 'YOUR-GOOGLE-CLIENT-ID',
      appSecret: 'YOUR-GOOGLE-CLIENT-SECRET',
      requiredDomain: 'yourdomain.com'
    }
  }
};
