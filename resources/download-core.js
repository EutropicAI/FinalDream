const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args))
const fs = require('node:fs')
const path = require('node:path')
const extract = require('extract-zip')
const { promisify } = require('node:util')
const streamPipeline = promisify(require('node:stream').pipeline)

// Configuration
const VERSION = '20260215'
const BASE_URL = `https://github.com/nihui/zimage-ncnn-vulkan/releases/download/${VERSION}`

const PLATFORMS = {
  'win32': 'windows',
  'darwin': 'macos',
  'linux': 'linux'
}

// Map Node.js platform to zimage platform string
const CURRENT_PLATFORM = PLATFORMS[process.env.PLATFORM || process.platform]

if (!CURRENT_PLATFORM) {
  console.error(`Unsupported platform: ${process.platform}`)
  process.exit(1)
}

const FILENAME = `zimage-ncnn-vulkan-${VERSION}-${CURRENT_PLATFORM}.zip`
const DOWNLOAD_URL = `${BASE_URL}/${FILENAME}`
const TARGET_DIR = path.join(__dirname, 'FinalDream-core')
const TEMP_ZIP_PATH = path.join(__dirname, FILENAME)
const TEMP_EXTRACT_DIR = path.join(__dirname, 'temp_extract')

console.log('-'.repeat(50))
console.log(`Platform: ${process.platform}`)
console.log(`Target Version: ${VERSION}`)
console.log(`Download URL: ${DOWNLOAD_URL}`)
console.log(`Target Directory: ${TARGET_DIR}`)
console.log('-'.repeat(50))

async function downloadFile(url, destPath) {
  console.log(`Downloading ${url}...`)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Unexpected response ${response.statusText}`)
  }
  await streamPipeline(response.body, fs.createWriteStream(destPath))
  console.log('Download complete.')
}

async function main() {
  try {
    // 1. Clean previous installations
    if (fs.existsSync(TARGET_DIR)) {
      console.log(`Removing existing directory: ${TARGET_DIR}`)
      fs.rmSync(TARGET_DIR, { recursive: true, force: true })
    }
    if (fs.existsSync(TEMP_EXTRACT_DIR)) {
      fs.rmSync(TEMP_EXTRACT_DIR, { recursive: true, force: true })
    }

    // 2. Download
    await downloadFile(DOWNLOAD_URL, TEMP_ZIP_PATH)

    // 3. Extract
    console.log(`Extracting to ${TEMP_EXTRACT_DIR}...`)
    await extract(TEMP_ZIP_PATH, { dir: TEMP_EXTRACT_DIR })
    console.log('Extraction complete.')

    // 4. Flatten and Move
    // The zip usually contains a single folder named like the zip file (without .zip)
    const files = fs.readdirSync(TEMP_EXTRACT_DIR)
    const innerFolder = files.find(f => fs.statSync(path.join(TEMP_EXTRACT_DIR, f)).isDirectory())
    
    if (!innerFolder) {
      throw new Error('Could not find inner folder in extracted zip')
    }

    const sourcePath = path.join(TEMP_EXTRACT_DIR, innerFolder)
    console.log(`Moving contents from ${sourcePath} to ${TARGET_DIR}...`)
    
    // Create target dir
    fs.mkdirSync(TARGET_DIR, { recursive: true })

    // Move all files from inner folder to TARGET_DIR
    const innerFiles = fs.readdirSync(sourcePath)
    for (const file of innerFiles) {
      const src = path.join(sourcePath, file)
      const dest = path.join(TARGET_DIR, file)
      fs.renameSync(src, dest)
    }

    // 5. Cleanup
    console.log('Cleaning up temporary files...')
    fs.unlinkSync(TEMP_ZIP_PATH)
    fs.rmSync(TEMP_EXTRACT_DIR, { recursive: true, force: true })

    console.log('Success! FinalDream-core is ready.')

  } catch (error) {
    console.error('Error:', error)
    // Cleanup on error
    if (fs.existsSync(TEMP_ZIP_PATH)) fs.unlinkSync(TEMP_ZIP_PATH)
    if (fs.existsSync(TEMP_EXTRACT_DIR)) fs.rmSync(TEMP_EXTRACT_DIR, { recursive: true, force: true })
    process.exit(1)
  }
}

main()
