# dv1677-ht26-grupp5-backend

## Gruppmedlemmar

| Namn                 | GitHub        |
| -------------------- | ------------- |
| Rebaz Mohammad Ahmad | rebahama      |
| Tuan Anh Pham        | tuananhpham95 |

## Projektval

Vi har valt bokningssystem resource-booking-ht26

Vi båda två har erfarenhet av liknande projekt och kände att detta var mest passande för oss att jobba med.

## Teknikval

**Frontend-ramverk:** React / Vue / Svelte

React kommer att användas eftersom att det finns en stor community och väldigt bra dokumentation, även tidigare erfarenhet av React finns som gör att valet hamnade på React.

## Kör lokalt

1. git clone <repo-url>
2. cd dv1677-ht26-grupp5-backend
3. cp .env.example .env
4. npm install
5. npm start

**Miljövariabler** (se .env.example):

| Variabel    | Beskrivning                      |
| ----------- | -------------------------------- |
| MONGODB_URI | Anslutningssträng till MongoDB   |
| PORT=3000   | Anslutningssträng till npm start |

## Tester

npm test

## Driftsatt

- Backend: https://grupp5.jsramverk.se
- Frontend: https://grupp5.github.io/dv1677-ht26-grupp5-frontend

## Tillvägagångssätt

Dokumentera löpande vad ni gjort och hur ni löst problem.

- Vecka 1: Repot skapades och lades till med Klona + nytt repo, sedan kördes npm install för att installera appen. Alla steg gick bra och applikationen startades upp utan problem. Även npm audit kördes som visade: "3 moderate severity vulnerabilities", npm audit fix lyckades inte fixa dessa 3 stycken vulnerabilites.

- Vecka 2: Implementerade uppdatering av resurs. updateOne lades till i resources.mjs. app.mjs fick PUT /resources/:id och POST /resources/:id så att både API och HTML-formuläret kan spara. Formuläret postar till /resources/:id vid redigering. Knappen “Redigera resurs” lades till på resurssidan. Testat: nytt kan skapas och befintligt kan uppdateras .

- Vecka 3: Gjorde en migrering ifrån SQL till MongoDb, först installerades mongoDB sedan skapades en databas i MongoDb Atlas. Efter detta så gjordes database.mjs filen om till att kunna köra en anslutning till den nya databasen ifrån föregående SQL. Syntaxen för att skapa och rendera datan i den nya databasen gjordes om i booking.mjs filen och resources.mjs, detta för att kunna utföra samma funktioner som tidigare när sql databasen fanns som anslutning. När allt detta var klart så lades samma data som tidigare in i databasen ifrån localhost:3000 gränsnittet och allting fungerade, även i Mongo Db Atlas sidan så kontrollerades att all data fanns på plats.