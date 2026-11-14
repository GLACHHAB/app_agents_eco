# Les agents économiques

Prototype pédagogique permettant de choisir un agent économique, d’identifier ses huit flux sortants parmi les 40 propositions, puis d’échanger des demandes entre agents. Le destinataire peut accepter ou refuser une demande avec une justification. Une proposition identique (même flux, destinataire et nature) ne peut pas être envoyée deux fois par le même agent.

Les agents et les propositions proviennent du fichier `banque_40_flux_agents_economiques_v0_1.json`.
Lors de l’envoi, le destinataire et la nature proposés doivent correspondre à la banque ; un message invite à réessayer sans donner la réponse. Les demandes enregistrées avant l’ajout de ce contrôle restent accessibles sans modification.

## Démarrer

Avec Node.js 20.19+ ou 22.12+ installé :

```bash
npm install
npm run dev
```

Ouvrir l’adresse locale indiquée dans le terminal, puis ouvrir plusieurs onglets dans le même navigateur et choisir un agent dans chacun. Le choix de l’agent est propre à chaque onglet et conservé lors de son actualisation. Les flux validés et les demandes sont partagés entre les onglets et conservés dans le stockage local du navigateur ; les sélections non vérifiées restent locales à l’onglet. La réinitialisation confirmée efface les flux validés et les demandes pour tous les onglets.

La synchronisation utilise `localStorage`, `BroadcastChannel`, l’événement `storage` et l’API Web Locks pour sérialiser les modifications simultanées. Utiliser un navigateur récent prenant en charge ces fonctionnalités, sur localhost ou en HTTPS (notamment GitHub Pages). Les données restent sur ce navigateur et ne sont pas partagées entre ordinateurs ou profils de navigateur.

## Vérifier et construire

```bash
npm test
npm run lint
npm run build
npm run preview
```

La construction produit le dossier `dist`.

## Déploiement sur GitHub Pages

Le projet est configuré pour un dépôt nommé exactement `app_agents_eco`. Après création du dépôt et envoi du projet sur sa branche `main`, ouvrir **Settings → Pages** sur GitHub et choisir **GitHub Actions** comme source de publication. Le workflow construit et publie automatiquement l’application à chaque push sur `main`. Vérifier son résultat dans l’onglet **Actions**.

L’adresse prévue est `https://<utilisateur>.github.io/app_agents_eco/` (remplacer `<utilisateur>` par le nom du compte ou de l’organisation). Si le dépôt est renommé, modifier aussi `base` dans `vite.config.ts`. La disponibilité de GitHub Pages dépend du plan et de la visibilité du dépôt.

Le site sera accessible depuis un autre ordinateur, mais les parties restent propres à chaque navigateur et ne se synchronisent pas entre ordinateurs.
