const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    // /funkcionalnosti-streznika/
    if (req.url === '/funkcionalnosti-streznika/') {
        fs.readFile(path.join(__dirname, 'funkcionalnosti_streznika.html'), (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Napaka pri nalaganju HTML dokumenta za funkcionalnosti strežnika.');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(data);
            }
        });
    }

    // /posebnosti/
    else if (req.url === '/posebnosti/') {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`
POSEBNOSTI IMPLEMENTACIJE STREŽNIKA – FITNESS BUDDY

Strežniški del aplikacije Fitness Buddy bo odgovoren za obdelavo zahtevkov odjemalca, varno hrambo podatkov, avtentikacijo uporabnikov, sinhronizacijo podatkov med napravami ter podporo delovanju progresivne spletne aplikacije.

1. Avtentikacija in avtorizacija uporabnikov
- Strežnik mora omogočati registracijo, prijavo in preverjanje identitete uporabnika.
- Za varno prijavo se lahko uporabi JWT ali strežniške seje.
- Gesla morajo biti na strežniku shranjena v zgoščeni obliki.
- Zaščitene poti morajo biti dostopne samo prijavljenim uporabnikom.

2. Upravljanje uporabniških podatkov
- Strežnik mora hraniti profile uporabnikov, njihove cilje, nastavitve in zgodovino aktivnosti.
- Podatki morajo biti zapisani v bazo podatkov.
- Omogočeno mora biti urejanje uporabniškega profila in pregled osebnih nastavitev.

3. Upravljanje treningov, prehrane in hidracije
- Strežnik mora omogočati sprejemanje, shranjevanje, spreminjanje in brisanje zapisov o treningih, obrokih in hidraciji.
- Vsak zapis mora biti povezan s konkretnim uporabnikom.
- Strežnik mora vračati podatke v strukturirani obliki, primerni za prikaz v odjemalcu.

4. Sinhronizacija offline podatkov
- Ker aplikacija deluje po principu offline-first, mora strežnik podpirati sinhronizacijo lokalno shranjenih podatkov, ko se povezava ponovno vzpostavi.
- Pri sinhronizaciji mora strežnik preveriti pravilnost podatkov in preprečiti podvajanje zapisov.
- Potrebna je logika za usklajevanje sprememb med lokalno in oddaljeno kopijo podatkov.

5. Analiza napredka
- Strežnik mora omogočati pripravo agregiranih podatkov za analizo napredka.
- To vključuje izračune, kot so število treningov v določenem obdobju, povprečna hidracija, prehranske navade in doseganje ciljev.
- Rezultati se posredujejo odjemalcu za prikaz grafov in statistik.

6. Upravljanje opomnikov
- Strežnik mora hraniti nastavitve opomnikov in urnike, povezane z uporabnikovimi navadami.
- Omogočati mora pošiljanje ali pripravo podatkov za prikaz opomnikov v odjemalcu.
- Podpirati mora tudi posodabljanje pravil opomnikov glede na uporabnikove spremembe.

7. Baza podatkov
- Za trajno shranjevanje podatkov je potrebna uporaba baze podatkov, na primer PostgreSQL ali MongoDB.
- Podatkovni model mora vključevati uporabnike, treninge, obroke, cilje, navade, hidracije in opomnike.
- Zagotoviti je treba varno delo z bazo in ustrezno validacijo vhodnih podatkov.

8. Varnost strežnika
- Strežnik mora preverjati vhodne podatke in preprečevati neveljavne ali škodljive zahtevke.
- Komunikacija med odjemalcem in strežnikom naj bo zaščitena z uporabo HTTPS.
- Potrebno je ustrezno obravnavanje napak in varno vračanje odgovorov.

9. Tehnologije za implementacijo strežnika
- Strežniški del bo razvit z Node.js.
- Za organizacijo API storitev je primerna uporaba Express ogrodja, čeprav je pri tej nalogi mogoče usmerjanje izvesti tudi z osnovnim modulom http.
- Za delo z datotekami in potmi se uporabljajo vgrajeni moduli, kot so fs, path in http.
- Za povezavo z bazo podatkov se uporabi ustrezni gonilnik ali knjižnica.

10. Posebne zahteve okolja
- Naprava uporabnika za strežniški del ne potrebuje posebnih senzorjev.
- Strežnik mora biti nameščen v okolju, ki omogoča izvajanje Node.js aplikacij in dostop do baze podatkov.
- Za produkcijsko uporabo je priporočena namestitev na oblačni ali namenski strežnik.

Povzetek:
Strežnik v aplikaciji Fitness Buddy ni namenjen samo hrambi podatkov, temveč predstavlja osrednji del sistema za avtentikacijo, sinhronizacijo, analitiko in upravljanje uporabniških informacij. Njegova implementacija mora biti varna, zanesljiva in prilagojena podpori offline-first delovanja aplikacije.
        `);
    }

    // slika UML diagrama za strežnik
    else if (req.url === '/uml_diagram.png') {
        fs.readFile(path.join(__dirname, 'uml_diagram.png'), (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Slika ni najdena.');
            } else {
                res.writeHead(200, { 'Content-Type': 'image/png' });
                res.end(data);
            }
        });
    }

    else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Stran ne obstaja.');
    }
});

server.listen(3000, () => {
    console.log('Strežnik deluje na vratih 3000...');
});
