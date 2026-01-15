const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'assets');

// Criar pasta se não existir
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir);
}

// Cores do app
const primaryColor = Buffer.from([255, 107, 107]); // #FF6B6B
const bgColor = Buffer.from([26, 26, 26]); // #1a1a1a

async function createAssets() {
  try {
    // Icon (1024x1024)
    await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 3,
        background: bgColor
      }
    })
      .composite([
        {
          input: Buffer.from([
            0, 0, 0, 255,
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 255
          ]),
          raw: { width: 2, height: 2, channels: 4 },
          top: 100,
          left: 100
        }
      ])
      .png()
      .toFile(path.join(assetsDir, 'icon.png'));

    // Splash (1242x2436)
    await sharp({
      create: {
        width: 1242,
        height: 2436,
        channels: 3,
        background: bgColor
      }
    })
      .png()
      .toFile(path.join(assetsDir, 'splash.png'));

    // Adaptive Icon (1080x1080)
    await sharp({
      create: {
        width: 1080,
        height: 1080,
        channels: 3,
        background: primaryColor
      }
    })
      .png()
      .toFile(path.join(assetsDir, 'adaptive-icon.png'));

    // Favicon (192x192)
    await sharp({
      create: {
        width: 192,
        height: 192,
        channels: 3,
        background: primaryColor
      }
    })
      .png()
      .toFile(path.join(assetsDir, 'favicon.png'));

    console.log('✓ Assets criados com sucesso!');
  } catch (error) {
    console.error('✗ Erro ao criar assets:', error);
  }
}

createAssets();
