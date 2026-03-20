use anyhow::Result;

#[cfg(target_os = "windows")]
pub fn set_system_proxy(enable: bool, host: &str, port: u16) -> Result<()> {
    use winreg::enums::*;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let key = hkcu.open_subkey_with_flags(
        r"Software\Microsoft\Windows\CurrentVersion\Internet Settings",
        KEY_SET_VALUE,
    )?;

    if enable {
        key.set_value("ProxyEnable", &1u32)?;
        key.set_value("ProxyServer", &format!("{}:{}", host, port))?;
    } else {
        key.set_value("ProxyEnable", &0u32)?;
    }

    // Notify system of proxy change
    notify_proxy_change();

    log::info!(
        "System proxy {}: {}:{}",
        if enable { "enabled" } else { "disabled" },
        host,
        port
    );
    Ok(())
}

#[cfg(target_os = "windows")]
fn notify_proxy_change() {
    use std::ptr;
    const INTERNET_OPTION_SETTINGS_CHANGED: u32 = 39;
    const INTERNET_OPTION_REFRESH: u32 = 37;

    #[link(name = "wininet")]
    extern "system" {
        fn InternetSetOptionW(h: *mut (), opt: u32, buf: *mut (), len: u32) -> i32;
    }
    unsafe {
        InternetSetOptionW(ptr::null_mut(), INTERNET_OPTION_SETTINGS_CHANGED, ptr::null_mut(), 0);
        InternetSetOptionW(ptr::null_mut(), INTERNET_OPTION_REFRESH, ptr::null_mut(), 0);
    }
}

#[cfg(target_os = "macos")]
pub fn set_system_proxy(enable: bool, host: &str, port: u16) -> Result<()> {
    let service = "Wi-Fi";
    if enable {
        run_cmd("networksetup", &["-setwebproxy", service, host, &port.to_string()])?;
        run_cmd("networksetup", &["-setsecurewebproxy", service, host, &port.to_string()])?;
        run_cmd("networksetup", &["-setsocksfirewallproxy", service, host, &port.to_string()])?;
        run_cmd("networksetup", &["-setwebproxystate", service, "on"])?;
        run_cmd("networksetup", &["-setsecurewebproxystate", service, "on"])?;
        run_cmd("networksetup", &["-setsocksfirewallproxystate", service, "on"])?;
    } else {
        run_cmd("networksetup", &["-setwebproxystate", service, "off"])?;
        run_cmd("networksetup", &["-setsecurewebproxystate", service, "off"])?;
        run_cmd("networksetup", &["-setsocksfirewallproxystate", service, "off"])?;
    }
    log::info!(
        "System proxy {}: {}:{}",
        if enable { "enabled" } else { "disabled" },
        host,
        port
    );
    Ok(())
}

#[cfg(target_os = "macos")]
fn run_cmd(program: &str, args: &[&str]) -> Result<()> {
    let output = std::process::Command::new(program).args(args).output()?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("{} failed: {}", program, stderr);
    }
    Ok(())
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
pub fn set_system_proxy(_enable: bool, _host: &str, _port: u16) -> Result<()> {
    anyhow::bail!("System proxy not supported on this platform")
}
