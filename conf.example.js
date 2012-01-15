module.exports = {
  // port to listen on
  port: 8085,

  proxyTo: {
    host: 'localhost',
    port: 8080
  },

  sessionSecret: 'AeV8Thaieel0Oor6shainu6OUfoh3ohwZaemohC0Ahn3guowieth2eiCkohhohG4', // change me

  // Register a new app on Github at
  // https://github.com/account/applications/new
  github: {
    appId: 'YOUR-GITHUB-APP-ID',
    appSecret: 'YOUR-GITHUB-APP-SECRET',
    requiredOrganization: 'YOUR-ORGANIZATION-NAME' // short organization name
  }
};
