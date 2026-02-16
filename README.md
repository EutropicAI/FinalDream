# FinalDream

<div align="center">
<img src="./resources/icon.png" width="30%"/>
</div>

![MacOS](https://img.shields.io/badge/Support-MacOS-blue?logo=Apple&style=flat-square)
![Windows](https://img.shields.io/badge/Support-Windows-blue?logo=Windows&style=flat-square)
![Linux](https://img.shields.io/badge/Support-Linux-blue?logo=Linux&style=flat-square)
[![CI-test](https://github.com/EutropicAI/FinalDream/actions/workflows/CI-test.yml/badge.svg)](https://github.com/EutropicAI/FinalDream/actions/workflows/CI-test.yml)
[![CI-build](https://github.com/EutropicAI/FinalDream/actions/workflows/CI-build.yml/badge.svg)](https://github.com/EutropicAI/FinalDream/actions/workflows/CI-build.yml)
[![Release](https://github.com/EutropicAI/FinalDream/actions/workflows/Release.yml/badge.svg)](https://github.com/EutropicAI/FinalDream/actions/workflows/Release.yml)
![Download](https://img.shields.io/github/downloads/EutropicAI/FinalDream/total)
![License](https://img.shields.io/github/license/EutropicAI/FinalDream?style=flat-square)

**One last step for your dreams.**

FinalDream is a cross-platform AI image generation tool that allows you to generate high-quality images with off-line AI models. It works on most of the modern computers with Vulkan support.

### Screenshots

<div align="center">
<!-- Insert screenshots here -->
</div>

### Installation

#### [Download the latest release from here.](https://github.com/EutropicAI/FinalDream/releases)

```bash
sudo spctl --master-disable
# Disable Gatekeeper, then allow applications downloaded from anywhere in System Preferences > Security & Privacy > General
xattr -cr /Applications/FinalDream.app
```

In first time, you need to run the command above in terminal to allow the app to run.

### Tech Stack

- **[z-image](https://github.com/Tongyi-MAI/Z-Image)**
- **[zimage-ncnn-vulkan](https://github.com/nihui/zimage-ncnn-vulkan)**
- Gemini 3 Pro
- Claude Sonnet 4.5 (Thinking)
- Antigravity
- Cursor

### License

This project is licensed under the BSD 3-Clause - see the [LICENSE file](./LICENSE) for details.

### Acknowledgements

<a href="https://star-history.com/#EutropicAI/FinalDream&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=EutropicAI/FinalDream&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=EutropicAI/FinalDream&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=EutropicAI/FinalDream&type=Date" />
  </picture>
</a>
