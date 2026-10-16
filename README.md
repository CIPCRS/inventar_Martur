# Inventar PDA — inventar fizic cu scanare (SAP LX02 → PDA → Excel)

Aplicație web (PWA) pentru inventar fizic la raft: importă exportul de stoc din SAP (LX02), deschide joburi de
inventar, ghidează numărătorii pe PDA (Zebra, browser) locație cu locație, confirmă paleții prin scanarea etichetei
(Storage Unit) și exportă raportul *scriptic vs fizic* cu diferențe.

## Fișiere

| Fișier | Rol |
|---|---|
| `index.html` | toată aplicația (PDA + administrare + dashboard + export) |
| `config.js` | configurare: mod demo sau datele proiectului Firebase |
| `firestore.rules` | regulile de securitate Firestore (de copiat în consola Firebase) |
| `manifest.json`, `sw.js`, `icons/` | PWA — „Adaugă pe ecranul principal” pe PDA, funcționează și fără rețea |

## Pornire rapidă (mod demo, fără Firebase)

Deschide `index.html` de pe un server static (sau GitHub Pages) cu `demo: true` în `config.js`. Datele stau doar în
browserul respectiv — bun pentru a testa fluxul, nu pentru inventar real (PDA-urile nu văd aceleași date).

## Instalare reală (GitHub Pages + Firebase, plan gratuit Spark)

1. **Firebase**: [console.firebase.google.com](https://console.firebase.google.com) → *Add project* (ex. `inventar-pda`).
   - *Build → Authentication → Get started → Sign-in method → Email/Password → Enable.*
   - *Build → Firestore Database → Create database → Production mode* (regiunea `europe-west`).
   - *Firestore → Rules* → înlocuiește cu conținutul din `firestore.rules` → *Publish*.
   - *Project settings (⚙) → Your apps → Web (</>)* → *Register app* → copiază obiectul `firebaseConfig`.
2. **config.js**: pune `demo: false` și completează `firebase: { apiKey, authDomain, projectId, ... }` cu valorile copiate.
3. **GitHub Pages**: creează repository-ul (poate fi privat în organizație), urcă toate fișierele, *Settings → Pages →
   Deploy from branch → main / root*. Adresa va fi `https://<org>.github.io/<repo>/`.
   - În Firebase: *Authentication → Settings → Authorized domains* → adaugă `<org>.github.io`.
4. **Prima configurare**: deschide adresa → ecranul „Prima configurare” → nume + PIN (6 cifre) → devine administrator.
   Apoi din *Utilizatori* creezi echipele de numărare (rol `numarator`) și eventual supervizori.
5. **Pe PDA**: deschide adresa în Chrome → meniu ⋮ → *Add to Home screen*. Login cu numele echipei + PIN.

### Zebra DataWedge
Profilul implicit trimite codul scanat ca tastatură (*Keystroke output*). Verifică în DataWedge → profil →
*Keystroke output → Basic data formatting → Send ENTER key* = activ (sau *Send TAB key* dezactivat, *Send ENTER* activ).
Aplicația acceptă codul 1D (Storage Unit, 14 cifre) și QR-ul (extrage primele 14 cifre), plus etichetele de locație
(ex. `A-1-2-3`). Pe ecranul de numărare câmpul de scanare e mereu focalizat; dacă nu, scanarea e prinsă oricum.

## Fluxul de lucru

**Administrator (laptop)** — *Joburi → + Job nou din export LX02*: alege fișierul, bifează zonele incluse (tot stocul
sau doar unele rânduri / zone de vrac), opțional filtru pe prefix de material, mod strict (paletul se scanează doar
după scanarea etichetei de locație) → *Creează jobul*.

**Numărător (PDA)** — *Numărare*: alege jobul → zona (rândul) sau scanează direct o etichetă de locație →
ecranul arată locația curentă, paleții așteptați (articol, descriere, lot, cantitate) și câmpul de scanare.
- scanare etichetă de locație → sare la acea locație (și o confirmă);
- scanare etichetă de palet aflat scriptic aici → **OK**, cantitatea se confirmă; când toți paleții locației sunt
  scanați, trece automat la următoarea locație nefinalizată;
- palet cu cantitate diferită → *Corectează cantitatea* (tastatură numerică);
- linie fără Storage Unit (ex. zona YER / 902) → *Confirmă manual* cu cantitatea;
- palet scriptic în **altă locație** → se înregistrează unde a fost găsit, status *Altă locație*;
- palet **necunoscut** în job → „Îl adaugi în stoc?” → articol (cu căutare în lista de materiale), cantitate, lot
  → status *În plus*;
- palet deja scanat → avertizare (unde, cine, când), nu se înregistrează a doua oară;
- *Termină locația* → paleții nescanați devin **Lipsă**; *Locație goală* → toți devin Lipsă; *Redeschide* anulează;
- *Zonă terminată…* închide toate locațiile incomplete din zonă dintr-o dată;
- *↶ Anulează* șterge ultima scanare proprie;
- zonele de vrac (F7/F10/F20/F30, YER, A-1-1…) au o singură „locație”: scanezi ce vezi, la final apare ce lipsește.

**Supervizor / administrator (laptop)** — *Dashboard*: progres în timp real pe zone și pe numărători, ultimele
diferențe; **Export Excel** cu foile *Scriptic vs Fizic* (toate coloanele din LX02 + Fizic, Diferență, Status,
Locație fizică, Scanat de, Data/ora, Observații — cu filtru pe antet), *Diferente*, *Sumar zone*, *Jurnal scanari*;
**Job de reverificare** → job nou doar cu liniile cu diferențe (de dat altei echipe).

Statusuri: `OK`, `Cantitate diferită`, `Altă locație`, `Lipsă`, `Nenumărat` (locație încă deschisă), `În plus`.

## Structura datelor (Firestore)

- `users/{uid}` — nume, slug, rol (`admin` / `supervizor` / `numarator`), activ.
- `jobs/{job}` — meta job + lista zonelor; `jobs/{job}/chunks/{zonă}` — liniile scriptice ale zonei (un document
  per zonă, nu per linie); `jobs/{job}/progress/{zonă}` — scanările (`sc`), paleții în plus (`ex`), locațiile închise (`cl`).
- `config/locked` — există după prima configurare (nu se mai poate crea administrator din afara aplicației).

### Consum pe planul gratuit Firebase Spark (50.000 citiri / 20.000 scrieri pe zi)
Structura „un document per zonă” ține consumul mic: importul unui job de ~10.700 paleți = ~30 scrieri; deschiderea
jobului pe un PDA = ~60 citiri; fiecare scanare = 1 scriere + ~2 citiri (PDA-ul propriu și dashboard-ul). Un inventar
general de ~10.700 paleți într-o singură zi ≈ 11–13.000 scrieri și 25–30.000 citiri — în limită, dar fără loc pentru
un al doilea inventar de aceeași mărime în aceeași zi. Dashboard-ul deschis pe mai multe laptopuri simultan adaugă
câte o citire per scanare fiecare. Dacă vrei rezervă, planul Blaze (plată la consum) costă la aceste volume sub 1 €/lună.

## Note
- Fără rețea, PDA-ul continuă să scaneze; Firestore ține scanările local și le trimite când revine Wi-Fi-ul.
- Nu există validare de lot; identificarea paletului e doar Storage Unit-ul.
- Fișierul LX02 trebuie să aibă coloanele: Material, Batch, Material Description, Storage Type, Storage Bin,
  Available stock, Base Unit of Measure, GR Date, Storage Unit (antetul e găsit automat).
