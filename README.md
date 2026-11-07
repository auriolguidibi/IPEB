# IPEB

## Envoi du formulaire de contact

Le formulaire envoie les demandes à `contact@ipeb.bj` via l’API Resend. Le serveur
ne démarre pas l’envoi tant que les deux variables d’environnement ci-dessous ne
sont pas configurées :

- `RESEND_API_KEY` : clé API Resend, conservée uniquement côté serveur.
- `RESEND_FROM_EMAIL` : adresse expéditrice vérifiée dans Resend, par exemple
  `IPEB <contact@ipeb.bj>`.

Dans PowerShell, définissez-les avant de démarrer le site :

```powershell
$env:RESEND_API_KEY = "re_votre_cle"
$env:RESEND_FROM_EMAIL = "IPEB <contact@ipeb.bj>"
npm start
```

Il faut créer un compte Resend et vérifier le domaine de l’adresse expéditrice.
Les réponses aux demandes sont configurées pour être adressées directement à
l’adresse e-mail du demandeur.