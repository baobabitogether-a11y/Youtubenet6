import 'cypress-mochawesome-reporter/register';

// Cypress support file
// Prevent failing tests on expected third-party iframe / YouTube API warnings
Cypress.on('uncaught:exception', (err, runnable) => {
  if (err.message.includes('postMessage') || err.message.includes('YT')) {
    return false;
  }
  return true;
});
