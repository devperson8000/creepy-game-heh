# Countdown menu cleanup

Removed the completed New map release card from the mode menu, its renderer/disposal references and its unused entry CSS import. The released map selection and gameplay remain intact.

Enlarged the Halloween countdown: desktop card grows from a maximum 420px to 620px, with larger title, digits, spacing and pumpkin. It uses normal document flow at widths of 1200px and below so it cannot overlap the play buttons. The October 31, 2026, 4 PM Australia/Sydney deadline and existing release signal are unchanged. No new final-countdown animation is implemented; that remains a design discussion.

Verification:

- All 279 tests in `tests/*.test.js` passed; build passed with the existing Three.js chunk-size advisory.
- Updated release-menu browser check passed clean old test URLs, removal of the map card, enlarged Halloween digits, desktop/mobile fitting, multiplayer/back, solo start and pause/return with no runtime errors.
- Rendered and measured 1920, 1440, 1280, 1201, 1200, 1101, 768, 600, 430, 390 and 320px widths. No mode-button overlap, horizontal overflow or clipped countdown digits. Card width was 576px at 1440 and 346px at 390. Desktop and phone screenshots were visually reviewed.
- Updated the map-release browser harness to look for the remaining Halloween announcement and assert that the completed map card is absent; no gameplay assertions were removed.
