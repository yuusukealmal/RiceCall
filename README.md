<div align="center">

# 📞 RiceCall (Backend)
*RiceCall backend, now written in Rust*

[![Rust](https://img.shields.io/badge/rust-1.83+-93450a.svg?style=flat-square&logo=rust)](https://www.rust-lang.org)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)

</div>

## ✨ Features
- 🌍 **i18n Support**: Available in English and Traditional Chinese
- 還沒想到

## 🚀 Quick Start

<details>
<summary><h3>👨‍💻 User</h3></summary>

1. Download the latest release from the [releases page](https://github.com/Nerdy-Home-ReOpen/rc-voice/releases).
  
    Download the `chat-server` binary and the `example_config.yaml` and `example.db` file.

2. Configure the server with the config file and database file.

3. Run the server:

```bash
./chat-server -c config.yaml
```

</details>

<details>
<summary><h3>🛠️ Developer</h3></summary>

1. Clone the repository:

```bash

git clone https://github.com/Nerdy-Home-ReOpen/rc-voice rc-voice-backend
cd rc-voice-backend

git checkout WebSocket
```

2. Configure the server:

```bash
mkdir data
cp misc/example_config.yaml data/config.yaml
cp misc/example.db data/db.sqlite3
# Edit config.yaml with your settings
```

3. Run the server:

```bash
cargo run --release -- -c data/config.yaml --init
```

</details>

## 🛠️ Configuration

TBD

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📦 Dependencies

- [axum](https://github.com/tokio-rs/axum) - Web framework
- [sqlx](https://github.com/launchbadge/sqlx) - Async SQL toolkit
- [tokio](https://github.com/tokio-rs/tokio) - Async runtime

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Rust Discord Community](https://discord.gg/rust-lang)

---

<div align="center">

Made with ❤️ and 🦀

</div>