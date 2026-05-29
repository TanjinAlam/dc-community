; customInit runs in .onInit — AFTER the new installer's CRC self-check
; but BEFORE NSIS looks for an existing installation in the registry.
; Deleting the old uninstall key here means NSIS never tries to run the
; old (corrupted) uninstaller. Safe: registry ops don't affect the new
; installer's CRC. Do NOT run taskkill here — that was the previous bug.

!macro customInit
  ; Remove old uninstall registry entries under every key electron-builder
  ; may have written, regardless of which version created them.
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\com.pear.social"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\pear-social"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Pear Social"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\com.pear.social"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\pear-social"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Pear Social"
!macroend

; Kill the running app here — CRC check has already passed at this point
; so process termination cannot affect it.
!macro customInstall
  nsExec::ExecToLog 'taskkill /F /IM "PearSocial.exe" /T'
  Sleep 1500
!macroend

!macro customUnInstall
!macroend
