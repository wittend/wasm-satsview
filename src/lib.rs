//! GNSS sky projection and SVG rendering. Azimuth is clockwise from true north.
use serde::Deserialize;
use std::fmt::Write;

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Satellite {
    pub id: String,
    pub constellation: String,
    pub azimuth: f64,
    pub elevation: f64,
    pub cn0: Option<f64>,
    #[serde(default)]
    pub used: bool,
    pub signal: Option<String>,
}
#[derive(Clone, Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Frame {
    pub satellites: Vec<Satellite>,
    pub fix: Option<String>,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct Options {
    pub compass: bool,
    pub grid: bool,
    pub labels: bool,
    pub signal_colors: bool,
    pub constellation_colors: bool,
    pub show_lock: bool,
    pub used_only: bool,
    pub min_elevation: f64,
    pub rotation: f64,
}
impl Default for Options {
    fn default() -> Self {
        Self {
            compass: true,
            grid: true,
            labels: true,
            signal_colors: true,
            constellation_colors: true,
            show_lock: true,
            used_only: false,
            min_elevation: 0.0,
            rotation: 0.0,
        }
    }
}
#[cfg(any(test, target_arch = "wasm32"))]
#[derive(Deserialize)]
struct Request {
    frame: Frame,
    options: Options,
}

/// Equidistant polar projection: horizon at radius 220; zenith at the center.
pub fn project(azimuth: f64, elevation: f64, rotation: f64) -> (f64, f64) {
    let r = 220.0 * (90.0 - elevation) / 90.0;
    let a = (azimuth - rotation).to_radians();
    (300.0 + r * a.sin(), 300.0 - r * a.cos())
}
fn escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}
pub fn constellation_color(c: &str) -> &'static str {
    match c {
        "GPS" => "#70b5ff",
        "GLONASS" => "#ed9dff",
        "Galileo" => "#5de0c0",
        "BeiDou" => "#ffbe70",
        "QZSS" => "#f8df72",
        "SBAS" => "#b5a4ff",
        "NavIC" => "#ff8eaa",
        _ => "#aab8c9",
    }
}
pub fn signal_color(cn0: Option<f64>) -> &'static str {
    match cn0 {
        None => "#64748b",
        Some(v) if v < 20.0 => "#f87171",
        Some(v) if v < 35.0 => "#fbbf24",
        Some(_) => "#4ade80",
    }
}
pub fn render(frame: &Frame, o: &Options) -> Result<String, String> {
    if !o.rotation.is_finite()
        || !o.min_elevation.is_finite()
        || !(0.0..=90.0).contains(&o.min_elevation)
    {
        return Err("rotation must be finite; minElevation must be 0..90".into());
    }
    if frame.satellites.len() > 512 {
        return Err("at most 512 satellite signals per frame".into());
    }
    if !matches!(
        frame.fix.as_deref(),
        None | Some("unknown" | "none" | "2d" | "3d")
    ) {
        return Err("fix must be unknown, none, 2d or 3d".into());
    }
    for s in &frame.satellites {
        if s.id.is_empty()
            || s.id.len() > 64
            || s.constellation.is_empty()
            || s.constellation.len() > 64
            || s.signal.as_ref().is_some_and(|v| v.len() > 64)
            || !s.azimuth.is_finite()
            || !(0.0..360.0).contains(&s.azimuth)
            || !s.elevation.is_finite()
            || !(-90.0..=90.0).contains(&s.elevation)
            || s.cn0
                .is_some_and(|v| !v.is_finite() || !(0.0..=100.0).contains(&v))
        {
            return Err(
                "invalid satellite: check ID, constellation, angles and C/N0 ranges".into(),
            );
        }
    }
    let mut svg = String::from(
        r##"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 640" role="group" aria-label="GNSS satellite sky view"><circle cx="300" cy="300" r="220" fill="#101f32" stroke="#50627b" stroke-width="1.5"/>"##,
    );
    if o.grid {
        for el in [30.0, 60.0] {
            let r = 220.0 * (90.0 - el) / 90.0;
            write!(svg, r##"<circle cx="300" cy="300" r="{r}" fill="none" stroke="#2a3c54" stroke-dasharray="3 6"/><text x="306" y="{}" fill="#8096b0" font-size="11">{el}°</text>"##, 300.0-r+13.0).unwrap();
        }
        for az in (0..360).step_by(30) {
            let (x, y) = project(az as f64, 0.0, o.rotation);
            write!(
                svg,
                r##"<path d="M300 300 L{x:.2} {y:.2}" stroke="#263950"/>"##
            )
            .unwrap();
        }
    }
    svg.push_str(r##"<circle cx="300" cy="300" r="3" fill="#8ca4be"/>"##);
    if o.compass {
        for (az, label) in [(0.0, "N"), (90.0, "E"), (180.0, "S"), (270.0, "W")] {
            let a = (az - o.rotation).to_radians();
            let (x, y) = (300.0 + 255.0 * a.sin(), 300.0 - 255.0 * a.cos());
            write!(svg,r##"<text x="{x:.2}" y="{y:.2}" text-anchor="middle" dominant-baseline="central" fill="#d9e5f4" font-size="18" font-weight="600">{label}</text>"##).unwrap();
        }
    }
    for (i, s) in frame.satellites.iter().enumerate() {
        if s.elevation < o.min_elevation || (o.used_only && !s.used) {
            continue;
        }
        let (x, y) = project(s.azimuth, s.elevation, o.rotation);
        let rim = if o.constellation_colors {
            constellation_color(&s.constellation)
        } else {
            "#aab8c9"
        };
        let fill = if o.signal_colors {
            signal_color(s.cn0)
        } else {
            "#263950"
        };
        let dash = if s.used { "" } else { "3 2" };
        let title = escape(&format!(
            "{} {} · {} · az {:.1}° · el {:.1}° · C/N0 {} dB-Hz · {}",
            s.constellation,
            s.id,
            s.signal.as_deref().unwrap_or("signal unspecified"),
            s.azimuth,
            s.elevation,
            s.cn0.map(|v| format!("{v:.1}")).unwrap_or("unknown".into()),
            if s.used {
                "used in fix"
            } else {
                "not used in fix"
            }
        ));
        write!(svg,r##"<g data-satellite="{i}" tabindex="0" role="img" aria-label="{title}" transform="translate({x:.2} {y:.2})"><title>{title}</title><circle r="14" fill="{fill}" stroke="{rim}" stroke-width="3" stroke-dasharray="{dash}"/>"##).unwrap();
        if o.labels {
            let text_color = if o.signal_colors {
                "#07111e"
            } else {
                "#e2ecfa"
            };
            write!(svg,r##"<text y="1" text-anchor="middle" dominant-baseline="central" fill="{text_color}" font-size="10" font-weight="700" pointer-events="none">{}</text>"##,escape(&s.id)).unwrap();
        }
        svg.push_str("</g>");
    }
    if o.show_lock {
        let (color, label) = match frame.fix.as_deref() {
            Some("2d") => ("#4ade80", "2D position lock"),
            Some("3d") => ("#4ade80", "3D position lock"),
            Some("none") => ("#f87171", "No position lock"),
            _ => ("#94a3b8", "Position lock unknown"),
        };
        write!(svg,r##"<g aria-label="{label}"><circle cx="220" cy="604" r="5" fill="{color}"/><text x="234" y="609" fill="#c1d0e1" font-size="14">{label}</text></g>"##).unwrap();
    }
    svg.push_str("</svg>");
    Ok(svg)
}
#[cfg(any(test, target_arch = "wasm32"))]
fn request_json(input: &[u8]) -> Vec<u8> {
    let result = serde_json::from_slice::<Request>(input)
        .map_err(|e| e.to_string())
        .and_then(|r| render(&r.frame, &r.options));
    let value = match result {
        Ok(svg) => serde_json::json!({"svg":svg}),
        Err(error) => serde_json::json!({"error":error}),
    };
    serde_json::to_vec(&value).unwrap()
}
// The small synchronous ABI avoids generated JS glue or a separate bindgen toolchain.
#[cfg(target_arch = "wasm32")]
mod abi {
    #[unsafe(no_mangle)]
    pub extern "C" fn alloc(len: usize) -> *mut u8 {
        Box::into_raw(vec![0u8; len].into_boxed_slice()) as *mut u8
    }
    /// # Safety
    /// ptr/len must be a live allocation returned by alloc or render_json, freed once.
    #[unsafe(no_mangle)]
    pub unsafe extern "C" fn dealloc(ptr: *mut u8, len: usize) {
        unsafe {
            drop(Box::from_raw(std::ptr::slice_from_raw_parts_mut(ptr, len)));
        }
    }
    /// # Safety
    /// ptr/len must reference a live input allocation; caller retains ownership.
    #[unsafe(no_mangle)]
    pub unsafe extern "C" fn render_json(ptr: *const u8, len: usize) -> u64 {
        let bytes = unsafe { std::slice::from_raw_parts(ptr, len) };
        let out = super::request_json(bytes).into_boxed_slice();
        let n = out.len() as u64;
        let p = Box::into_raw(out) as *mut u8 as u32;
        (n << 32) | p as u64
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    fn close(p: (f64, f64), q: (f64, f64)) {
        assert!((p.0 - q.0).abs() < 1e-8 && (p.1 - q.1).abs() < 1e-8);
    }
    #[test]
    fn compass_projection() {
        close(project(0., 0., 0.), (300., 80.));
        close(project(90., 0., 0.), (520., 300.));
        close(project(180., 0., 0.), (300., 520.));
        close(project(270., 0., 0.), (80., 300.));
        close(project(123., 90., 0.), (300., 300.));
        close(project(90., 0., 90.), (300., 80.));
    }
    #[test]
    fn colors() {
        assert_eq!(signal_color(None), "#64748b");
        assert_eq!(signal_color(Some(0.)), "#f87171");
        assert_eq!(signal_color(Some(20.)), "#fbbf24");
        assert_eq!(signal_color(Some(35.)), "#4ade80");
    }
    #[test]
    fn validation_and_escaping() {
        let mut f = Frame {
            satellites: vec![Satellite {
                id: "<script>".into(),
                constellation: "GPS".into(),
                azimuth: 0.,
                elevation: 30.,
                cn0: None,
                used: false,
                signal: None,
            }],
            fix: None,
        };
        let s = render(&f, &Options::default()).unwrap();
        assert!(s.contains("&lt;script&gt;"));
        assert!(!s.contains("<script>"));
        f.satellites[0].azimuth = 360.;
        assert!(render(&f, &Options::default()).is_err());
    }
    #[test]
    fn filters_and_lock() {
        let f:Frame=serde_json::from_str(r#"{"satellites":[{"id":"1","constellation":"GPS","azimuth":0,"elevation":-1}],"fix":"none"}"#).unwrap();
        let s = render(&f, &Options::default()).unwrap();
        assert!(!s.contains("data-satellite"));
        assert!(s.contains("No position lock"));
        let o = Options {
            show_lock: false,
            ..Options::default()
        };
        assert!(!render(&f, &o).unwrap().contains("position lock"));
    }
    #[test]
    fn malformed_request() {
        let v: serde_json::Value = serde_json::from_slice(&request_json(b"{}")).unwrap();
        assert!(v["error"].is_string());
    }
}
