# Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
# brennanmmeyer@gmail.com

# Save a PNG of the BEZ Pro Write window (dev or installed build) for checking screens.
# Usage: pwsh tests/tools/snap-window.ps1 -Out shot.png
param([string]$Out = "bez-window.png", [string]$Process = "bez-pro-write")

Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Win {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
}
"@

$p = Get-Process -Name $Process -ErrorAction Stop | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $p) { throw "No $Process window found." }
$r = New-Object Win+RECT
[void][Win]::GetWindowRect($p.MainWindowHandle, [ref]$r)
$bmp = New-Object System.Drawing.Bitmap ($r.R - $r.L), ($r.B - $r.T)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$hdc = $g.GetHdc()
[void][Win]::PrintWindow($p.MainWindowHandle, $hdc, 2)  # 2 = full content, works with WebView2
$g.ReleaseHdc($hdc)
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
"Saved $Out ($($bmp.Width)x$($bmp.Height))"
