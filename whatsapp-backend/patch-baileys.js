'use strict';

// Backport the current WhatsApp pairing protocol fixes from WhiskeySockets/Baileys PR #2872
// to the pinned 6.7.24 release. Fail the image build if upstream changes the expected code.
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, 'node_modules', '@whiskeysockets', 'baileys', 'lib');

function replaceOnce(relativePath, before, after) {
  const file = path.join(root, relativePath);
  const source = fs.readFileSync(file, 'utf8');
  const count = source.split(before).length - 1;
  if (count !== 1) {
    throw new Error(`Expected exactly one pairing patch point in ${relativePath}; found ${count}`);
  }
  fs.writeFileSync(file, source.replace(before, after));
}

replaceOnce(
  path.join('Socket', 'messages-recv.js'),
  `const linkCodeCompanionReg = getBinaryNodeChild(node, 'link_code_companion_reg');\n                const ref =`,
  `const linkCodeCompanionReg = getBinaryNodeChild(node, 'link_code_companion_reg');\n                if (linkCodeCompanionReg?.attrs?.stage !== 'primary_hello') break;\n                const ref =`
);

replaceOnce(
  path.join('Socket', 'socket.js'),
  `if (!creds.me) {\n            node = generateRegistrationNode(creds, config);`,
  `if (!creds.me || (!!creds.pairingCode && !creds.registered)) {\n            node = generateRegistrationNode(creds, config);`
);

replaceOnce(
  path.join('Socket', 'socket.js'),
  `tag: 'link_code_pairing_nonce',\n                            attrs: {},\n                            content: '0'`,
  `tag: 'link_code_pairing_nonce',\n                            attrs: {},\n                            content: Buffer.alloc(1)`
);

// WhatsApp validates this pairing metadata. Keep its canonical platform display;
// the site's ASLNS branding belongs in the page UI, not this protocol field.
replaceOnce(
  path.join('Socket', 'socket.js'),
  `tag: 'companion_platform_display',\n                            attrs: {},\n                            content: \`${'${browser[1]} (${browser[0]})'}\``,
  `tag: 'companion_platform_display',\n                            attrs: {},\n                            content: 'Chrome (Mac OS)'`
);

replaceOnce(
  path.join('Utils', 'validate-connection.js'),
  `platform: platformNode?.attrs.name\n    };`,
  `platform: platformNode?.attrs.name,\n        registered: true\n    };`
);

console.info('Applied WhatsApp pairing protocol compatibility fixes');
