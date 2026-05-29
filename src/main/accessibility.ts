import { dialog, shell, systemPreferences } from 'electron'

async function openMacAccessibilitySettings(): Promise<void> {
  const targets = [
    'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
    'x-apple.systempreferences:com.apple.preference.security'
  ]

  for (const target of targets) {
    try {
      await shell.openExternal(target)
      return
    } catch (e) {
      console.warn(`Nepodařilo se otevřít ${target}:`, (e as Error).message)
    }
  }

  try {
    const err = await shell.openPath('/System/Library/PreferencePanes/Security.prefPane')
    if (!err) return
    console.warn('shell.openPath vrátil chybu:', err)
  } catch (e) {
    console.warn('Nepodařilo se otevřít Security.prefPane:', (e as Error).message)
  }

  dialog.showErrorBox(
    'Nelze otevřít nastavení',
    'Nastavení se nepodařilo otevřít automaticky. Otevřete ručně: Nastavení systému → Soukromí a zabezpečení → Zpřístupnění.'
  )
}

/**
 * Na macOS ověří oprávnění Accessibility (nutné pro globální zkratky).
 * Vrací true, pokud je oprávnění uděleno (a na ostatních platformách vždy).
 */
export function checkMacAccessibility(manual = false): boolean {
  if (process.platform !== 'darwin') return true

  const isTrusted = systemPreferences.isTrustedAccessibilityClient(false)
  if (!isTrusted) {
    console.log('Vyžadováno oprávnění pro usnadnění (Accessibility).')
    void dialog
      .showMessageBox({
        type: 'warning',
        title: 'Oprávnění pro usnadnění',
        message:
          'yaptap potřebuje oprávnění pro usnadnění (Accessibility), aby mohlo reagovat na globální klávesové zkratky.\n\n' +
          'Pokud jste oprávnění již udělili a stále to nefunguje, odeberte yaptap ze seznamu (tlačítkem mínus) a přidejte jej znovu. Poté aplikaci restartujte.',
        buttons: ['Otevřít nastavení', 'Zrušit']
      })
      .then(({ response }) => {
        if (response === 0) void openMacAccessibilitySettings()
      })
  } else if (manual) {
    void dialog
      .showMessageBox({
        type: 'info',
        title: 'Oprávnění pro usnadnění',
        message:
          'Systém hlásí, že oprávnění je uděleno. Pokud klávesy přesto nefungují, je to pravděpodobně způsobeno aktualizací aplikace (změna podpisu).\n\n' +
          'Řešení: Otevřete Nastavení systému → Soukromí a zabezpečení → Zpřístupnění, odeberte yaptap ze seznamu (tlačítkem mínus) a přidejte jej znovu. Poté aplikaci restartujte.',
        buttons: ['Otevřít nastavení', 'OK']
      })
      .then(({ response }) => {
        if (response === 0) void openMacAccessibilitySettings()
      })
  }
  return isTrusted
}
