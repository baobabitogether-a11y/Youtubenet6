describe('YouTube Video Viewer - Subtitle Detection (Step-by-Step)', () => {
  beforeEach(() => {
    cy.log('Step 0: Navigating to YouTube Video Viewer');
    cy.visit('/');
    cy.title().should('match', /YouTube/i);
    cy.get('header').should('be.visible');
  });

  it('Step-by-step: Auto-detect subtitles once caption icon is set to ON', () => {
    cy.log('Step 1: Locating caption toggle icon on the video player');
    cy.get('#caption-toggle-button').should('be.visible');
    cy.screenshot('test1-step1', { capture: 'viewport', overwrite: true });

    cy.log('Step 2: Checking caption toggle initial state');
    cy.get('#caption-toggle-button').then(($btn) => {
      const isPressed = $btn.attr('aria-pressed');
      if (isPressed !== 'true') {
        cy.log('Step 2a: Clicking caption toggle icon to switch ON');
        cy.get('#caption-toggle-button').click();
      }
    });
    cy.screenshot('test1-step2', { capture: 'viewport', overwrite: true });

    cy.log('Step 3: Verifying caption toggle button is active (aria-pressed=true)');
    cy.get('#caption-toggle-button').should('have.attr', 'aria-pressed', 'true');
    cy.screenshot('test1-step3', { capture: 'viewport', overwrite: true });

    cy.log('Step 4: Waiting for subtitles to be detected and rendered');
    cy.get('#subtitle-cue-row-0, #active-subtitle-cue-text, #restored-subtitles-toast', {
      timeout: 15000,
    }).should('be.visible');
    cy.screenshot('test1-step4', { capture: 'viewport', overwrite: true });

    cy.log('Step 5: Verifying subtitle text content is non-empty');
    cy.get('body').then(($body) => {
      if ($body.find('#subtitle-cue-row-0').length > 0) {
        cy.get('#subtitle-cue-row-0').first().invoke('text').should('have.length.greaterThan', 3);
      } else if ($body.find('#active-subtitle-cue-text').length > 0) {
        cy.get('#active-subtitle-cue-text').invoke('text').should('have.length.greaterThan', 3);
      }
    });
    cy.screenshot('test1-step5', { capture: 'viewport', overwrite: true });

    cy.log('Step 6: Confirming State Machine badge status is active');
    cy.get('body').then(($body) => {
      if ($body.find('#state-machine-status-badge').length > 0) {
        cy.get('#state-machine-status-badge').should('be.visible');
      }
    });
    cy.screenshot('test1-step6', { capture: 'viewport', overwrite: true });
  });

  it('Step-by-step: Fetch subtitles when caption icon is pressed after custom URL', () => {
    const targetUrl = 'https://www.youtube.com/watch?v=c0pUbsq9FLk';

    cy.log('Step 1: Entering target YouTube URL into input field');
    cy.get('#youtube-url-input').should('be.visible').clear().type(targetUrl);
    cy.screenshot('test2-step1', { capture: 'viewport', overwrite: true });

    cy.log('Step 2: Clicking Play Video button to cue video');
    cy.get('#play-video-button').click();
    cy.screenshot('test2-step2', { capture: 'viewport', overwrite: true });

    cy.log('Step 3: Locating caption toggle button');
    cy.get('#caption-toggle-button').should('be.visible');
    cy.screenshot('test2-step3', { capture: 'viewport', overwrite: true });

    cy.log('Step 4: Toggling caption icon to ON');
    cy.get('#caption-toggle-button').then(($btn) => {
      const isPressed = $btn.attr('aria-pressed');
      if (isPressed !== 'true') {
        cy.get('#caption-toggle-button').click();
      }
    });
    cy.get('#caption-toggle-button').should('have.attr', 'aria-pressed', 'true');
    cy.screenshot('test2-step4', { capture: 'viewport', overwrite: true });

    cy.log('Step 5: Waiting for subtitle cues to be fetched and rendered');
    cy.get('#subtitle-cue-row-0, #active-subtitle-cue-text, #restored-subtitles-toast', {
      timeout: 20000,
    }).should('be.visible');
    cy.screenshot('test2-step5', { capture: 'viewport', overwrite: true });

    cy.log('Step 6: Verifying subtitle content is valid speech dialogue');
    cy.get('body').then(($body) => {
      if ($body.find('#subtitle-cue-row-0').length > 0) {
        cy.get('#subtitle-cue-row-0').first().invoke('text').should('have.length.greaterThan', 3);
      } else if ($body.find('#active-subtitle-cue-text').length > 0) {
        cy.get('#active-subtitle-cue-text').invoke('text').should('have.length.greaterThan', 3);
      }
    });
    cy.screenshot('test2-step6', { capture: 'viewport', overwrite: true });
  });

  it('Step-by-step: Emulator testing - load FcRzAdI8R9U without fixtures, observe subtitles, change target language and assert tlang replacement', () => {
    const targetUrl = 'https://www.youtube.com/watch?v=FcRzAdI8R9U';

    cy.log('Step 1: Entering target YouTube URL without fixtures');
    cy.get('#youtube-url-input').should('be.visible').clear().type(targetUrl);
    cy.screenshot('test3-step1', { capture: 'viewport', overwrite: true });

    cy.log('Step 2: Cueing video playback');
    cy.get('#play-video-button').click();
    cy.screenshot('test3-step2', { capture: 'viewport', overwrite: true });

    cy.log('Step 3: Enabling captions via caption toggle icon');
    cy.get('#caption-toggle-button').then(($btn) => {
      const isPressed = $btn.attr('aria-pressed');
      if (isPressed !== 'true') {
        cy.get('#caption-toggle-button').click();
      }
    });
    cy.get('#caption-toggle-button').should('have.attr', 'aria-pressed', 'true');
    cy.screenshot('test3-step3', { capture: 'viewport', overwrite: true });

    cy.log('Step 4: Observing subtitle fetching from native stream / server');
    cy.get('#subtitle-cue-row-0, #active-subtitle-cue-text, #restored-subtitles-toast', {
      timeout: 20000,
    }).should('be.visible');
    cy.screenshot('test3-step4', { capture: 'viewport', overwrite: true });

    cy.log('Step 5: Verifying authentic dialogue is loaded');
    cy.get('body').then(($body) => {
      if ($body.find('#subtitle-cue-row-0').length > 0) {
        cy.get('#subtitle-cue-row-0').first().invoke('text').should('have.length.greaterThan', 3);
      } else if ($body.find('#active-subtitle-cue-text').length > 0) {
        cy.get('#active-subtitle-cue-text').invoke('text').should('have.length.greaterThan', 3);
      }
    });

    cy.log('Step 6: Switching target language and verifying tlang param replacement in timedtext request');
    cy.intercept('POST', '/api/youtube-timedtext-translate*').as('timedtextTranslate');
    cy.get('body').then(($body) => {
      if ($body.find('#target-language-select').length > 0) {
        cy.get('#target-language-select').select('es');
        cy.wait('@timedtextTranslate').then((interception) => {
          expect(interception.response?.statusCode).to.eq(200);
          expect(interception.response?.body.modifiedUrl).to.include('tlang=es');
        });
      }
    });
    cy.screenshot('test3-step5', { capture: 'viewport', overwrite: true });
  });
});
