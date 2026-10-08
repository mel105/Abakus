# -*- coding: utf-8 -*-
"""Vytvori ikonu Abakus na ploche (Windows) alebo spustac v menu a na ploche (Linux). Spusti raz."""
import os, subprocess, sys

TU = os.path.dirname(os.path.abspath(__file__))
PROGRAM = os.path.join(TU, "abakus.pyw")


def windows():
    pythonw = os.path.join(os.path.dirname(sys.executable), "pythonw.exe")
    if not os.path.exists(pythonw):
        pythonw = sys.executable
    ps = (
        "$d=[Environment]::GetFolderPath('Desktop');"
        "$s=(New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $d 'Abakus.lnk'));"
        "$s.TargetPath='%s';$s.Arguments='\"%s\"';$s.WorkingDirectory='%s';$s.IconLocation='%s';"
        "$s.Description='Abakus - kalkulacka prepoctov';$s.Save();Write-Output (Join-Path $d 'Abakus.lnk')"
    ) % (pythonw, PROGRAM, TU, os.path.join(TU, "abakus.ico"))
    r = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps], capture_output=True, text=True)
    if r.returncode != 0:
        print("Odkaz sa nepodarilo vytvorit:\n" + r.stderr)
        print('Rucne: pravy klik na plochu -> Novy -> Odkaz -> "%s" "%s"' % (pythonw, PROGRAM))
        sys.exit(1)
    print("Hotovo:", r.stdout.strip())


def linux():
    obsah = ("[Desktop Entry]\nType=Application\nName=Abakus\nComment=Kalkulacka prepoctov\n"
             "Exec=python3 \"%s\"\nIcon=%s\nTerminal=false\nCategories=Utility;Science;\n") % (PROGRAM, os.path.join(TU, "abakus.png"))
    ciele = [os.path.expanduser("~/.local/share/applications/abakus.desktop")]
    for plocha in ("~/Desktop", "~/Plocha"):
        if os.path.isdir(os.path.expanduser(plocha)):
            ciele.append(os.path.join(os.path.expanduser(plocha), "abakus.desktop"))
    for c in ciele:
        os.makedirs(os.path.dirname(c), exist_ok=True)
        with open(c, "w", encoding="utf-8") as f:
            f.write(obsah)
        os.chmod(c, 0o755)
        print("Hotovo:", c)


if __name__ == "__main__":
    windows() if os.name == "nt" else linux()
