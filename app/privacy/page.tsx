import Link from "next/link";
import type { Metadata } from "next";
import { LegalLayout } from "@/components/app/LegalLayout";
import { HOTEL_NAME } from "@/lib/roles";

export const metadata: Metadata = {
  title: "Politique de confidentialité | Hotel SES",
  description: "Données personnelles traitées par Hotel SES, finalités, destinataires, cookies, conservation et droits des personnes.",
};

const CONTACT = "contact@hotelmediterraneehammamet.com";

/* Describes what the app does today: keep in step with the database (supabase/*.sql),
   the session cookie (utils/supabase) and browser storage (lib/theme.ts, InstallCard). */

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout>
      <p className="legal-meta">En vigueur depuis le 26 novembre 2026 • Version 2.0</p>

      <header>
        <p className="legal-eyebrow">Protection des données personnelles</p>
        <h1>Politique de confidentialité</h1>
        <p>
          Cette politique décrit les données personnelles que Hotel SES, l’outil interne de l’{HOTEL_NAME}, enregistre sur le personnel et sur les clients, pourquoi, qui y a accès et
          comment exercer vos droits.
        </p>
      </header>

      <div>
        <section>
          <h2>1. Responsable du traitement</h2>
          <div className="legal-callout">
            <p>
              <strong>Responsable :</strong> {HOTEL_NAME}, Hammamet, Tunisie
            </p>
            <p>
              <strong>Contact :</strong> <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
            </p>
          </div>
          <p>
            Le traitement relève de la loi organique n° 2004-63 du 27 juillet 2004 portant sur la protection des données à caractère personnel, sous le contrôle de l’Instance nationale de
            protection des données personnelles (INPDP).
          </p>
        </section>

        <section>
          <h2>2. Données enregistrées</h2>
          <ul>
            <li>
              <strong>Comptes :</strong> identifiant, nom affiché, rôle, employé rattaché, date de dernière connexion. Le mot de passe est conservé sous forme chiffrée par le service
              d’authentification : personne, administrateur compris, ne peut le lire.
            </li>
            <li>
              <strong>Personnel :</strong> nom, fonction, service, numéro de téléphone professionnel, statut de service (en service, hors service, absent), heure de début du service,
              compétences.
            </li>
            <li>
              <strong>Clients :</strong> nom, téléphone, chambre, dates d’arrivée et de départ, nombre d’adultes et d’enfants dans la chambre.
            </li>
            <li>
              <strong>Demandes :</strong> chambre, service concerné, problème, détails saisis, priorité, statut, auteur, personne assignée, heures de création, de prise en charge et de
              résolution.
            </li>
          </ul>
          <p>Hotel SES n’enregistre ni donnée bancaire, ni pièce d’identité, ni localisation.</p>
        </section>

        <section>
          <h2>3. Finalités</h2>
          <ul>
            <li>traiter les demandes des clients et les transmettre au bon service ;</li>
            <li>suivre l’occupation et l’entretien des chambres ;</li>
            <li>organiser le personnel (annuaire, horaires, services) ;</li>
            <li>mesurer la qualité du service (délais de traitement, demandes par service et par chambre) ;</li>
            <li>sécuriser l’accès à l’outil (comptes personnels, rôles).</li>
          </ul>
        </section>

        <section>
          <h2>4. Qui y a accès</h2>
          <ul>
            <li>
              <strong>Le personnel de l’hôtel</strong>, selon son rôle (réception, ressources humaines, direction, administrateur) : chacun ne voit et ne modifie que ce que son rôle permet,
              règle appliquée par la base de données elle-même. Le détail figure dans les <Link href="/tos">conditions d’utilisation</Link>.
            </li>
            <li>
              <strong>Nos prestataires techniques</strong>, pour le compte de l’hôtel : Supabase (base de données et authentification) et Vercel (hébergement de l’application).
            </li>
          </ul>
          <p>Aucune donnée n’est vendue ni utilisée à des fins publicitaires.</p>
        </section>

        <section>
          <h2>5. Cookies et stockage sur l’appareil</h2>
          <p>Hotel SES n’utilise aucun cookie publicitaire ni outil de mesure d’audience.</p>
          <div className="legal-callout">
            <h3>Cookie de session (strictement nécessaire)</h3>
            <ul>
              <li>
                <strong>Nom :</strong> <code>sb-…-auth-token</code> (Supabase)
              </li>
              <li>
                <strong>Rôle :</strong> garder votre compte connecté entre deux pages.
              </li>
              <li>
                <strong>Durée :</strong> supprimé à la déconnexion ; sinon 400 jours au plus.
              </li>
            </ul>
            <h3>Stockage local du navigateur</h3>
            <ul>
              <li>
                <strong>Thème choisi</strong> (clair, sombre ou système), sur cet appareil uniquement.
              </li>
              <li>
                <strong>Bandeau d’installation</strong> : la date à laquelle vous l’avez fermé, pour ne pas le réafficher pendant 7 jours.
              </li>
              <li>
                <strong>Application installée</strong> : les fichiers de l’application (pas vos données), pour un démarrage rapide et une page hors connexion.
              </li>
            </ul>
          </div>
        </section>

        <section>
          <h2>6. Conservation</h2>
          <ul>
            <li>
              <strong>Comptes :</strong> jusqu’à leur suppression par l’administrateur. Un compte désactivé reste enregistré mais ne peut plus se connecter.
            </li>
            <li>
              <strong>Personnel :</strong> jusqu’à la suppression de l’employé par les ressources humaines.
            </li>
            <li>
              <strong>Clients et demandes :</strong> conservés pour l’historique des chambres et les analyses. Hotel SES ne les supprime pas automatiquement : une demande se supprime depuis
              l’application, et toute autre suppression se demande au contact ci-dessus.
            </li>
          </ul>
        </section>

        <section>
          <h2>7. Sécurité</h2>
          <ul>
            <li>comptes personnels, mot de passe temporaire à changer dès la première connexion ;</li>
            <li>droits vérifiés par le serveur et par la base de données pour chaque action, selon le rôle ;</li>
            <li>connexions chiffrées (HTTPS) ;</li>
            <li>désactivation immédiate d’un compte par l’administrateur.</li>
          </ul>
        </section>

        <section>
          <h2>8. Vos droits</h2>
          <p>
            Toute personne concernée, membre du personnel ou client, peut demander l’accès à ses données, leur rectification ou leur suppression, et s’opposer à leur traitement pour un motif
            légitime. Écrivez à <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. Vous pouvez aussi saisir l’INPDP.
          </p>
        </section>
      </div>

      <footer className="legal-footer">
        <div>
          &copy; {new Date().getFullYear()} {HOTEL_NAME} • Hotel SES
        </div>
        <div>
          <Link href="/tos">Conditions d’utilisation</Link>
          <Link href="/login">Page de connexion</Link>
        </div>
      </footer>
    </LegalLayout>
  );
}
