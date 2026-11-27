import Link from "next/link";
import type { Metadata } from "next";
import { LegalLayout } from "@/components/app/LegalLayout";
import { HOTEL_NAME } from "@/lib/roles";

export const metadata: Metadata = {
  title: "Conditions d’utilisation | Hotel SES",
  description: "Règles d’utilisation de Hotel SES par le personnel de l’hôtel : comptes, rôles, confidentialité et traçabilité.",
};

/* Keep in step with the app: roles and what they may do come from lib/permissions.ts. */

export default function TermsOfServicePage() {
  return (
    <LegalLayout>
      <p className="legal-meta">En vigueur depuis le 26 novembre 2026 • Version 2.0</p>

      <header>
        <p className="legal-eyebrow">Charte d’utilisation</p>
        <h1>Conditions d’utilisation de Hotel SES</h1>
        <p>
          Hotel SES est l’outil interne de l’{HOTEL_NAME} pour suivre l’état des chambres, traiter les demandes des clients et organiser le personnel. Ces conditions s’appliquent à
          toute personne qui s’y connecte. Se connecter vaut acceptation.
        </p>
      </header>

      <div>
        <section>
          <h2>1. Comptes personnels</h2>
          <ul>
            <li>
              <strong>Un compte par personne :</strong> chaque membre du personnel reçoit de l’administrateur un identifiant et un mot de passe temporaire. Le compte est personnel : il ne se
              prête pas et ne se partage pas, même entre collègues d’un même service.
            </li>
            <li>
              <strong>Premier accès :</strong> le mot de passe temporaire doit être remplacé à la première connexion. Aucune page n’est accessible avant ce changement.
            </li>
            <li>
              <strong>Mot de passe oublié :</strong> seul l’administrateur peut en générer un nouveau. Il est temporaire, lui aussi.
            </li>
            <li>
              <strong>Fin de contrat ou absence longue :</strong> l’administrateur désactive le compte. Un compte désactivé ne peut plus se connecter.
            </li>
          </ul>
        </section>

        <section>
          <h2>2. Rôles et accès</h2>
          <p>Le rôle du compte, fixé par l’administrateur, détermine les pages et les actions disponibles. Le serveur vérifie chaque action, indépendamment de l’écran affiché.</p>
          <ul>
            <li>
              <strong>Réception :</strong> tableau de bord de la réception, plan des chambres, arrivées, départs et nombre de clients, cycle de ménage, création des demandes et des incidents
              passés, prise en charge, résolution, modification et suppression des demandes, analyses des chambres et des demandes.
            </li>
            <li>
              <strong>Ressources humaines :</strong> personnel (annuaire, horaires, services), consultation des chambres et des demandes, création de demandes, cycle de ménage, analyses des
              effectifs.
            </li>
            <li>
              <strong>Direction :</strong> tableau de bord de direction, chambres et cycle de ménage, création, résolution, modification et suppression des demandes, analyses, dont les
              tendances par chambre.
            </li>
            <li>
              <strong>Administrateur :</strong> l’ensemble des fonctions ci-dessus, plus la gestion des comptes et du parc des chambres.
            </li>
          </ul>
        </section>

        <section>
          <h2>3. Bon usage</h2>
          <ul>
            <li>
              <strong>Postes partagés :</strong> utilisez « Se déconnecter » avant de quitter un poste de la réception ou un appareil commun.
            </li>
            <li>
              <strong>Exactitude :</strong> enregistrez les demandes, les arrivées, les départs et l’état des chambres au moment où ils ont lieu. Un incident découvert après coup s’enregistre
              comme « Incident passé », avec sa date réelle.
            </li>
            <li>
              <strong>Incident de sécurité :</strong> un accès suspect, un mot de passe divulgué ou un appareil perdu se signale sans délai à l’administrateur, qui réinitialise ou désactive le
              compte.
            </li>
          </ul>
        </section>

        <section>
          <h2>4. Confidentialité des clients</h2>
          <p>
            Les informations sur les clients (chambre, séjour, nombre de personnes, demandes et réclamations) relèvent du secret professionnel. Elles servent uniquement au service rendu aux
            clients.
          </p>
          <ul>
            <li>Ne les copiez, photographiez ou transmettez pas en dehors de l’hôtel.</li>
            <li>N’en parlez qu’aux collègues qui en ont besoin pour traiter la demande.</li>
          </ul>
        </section>

        <section>
          <h2>5. Traçabilité</h2>
          <p>Hotel SES conserve, pour le suivi du service :</p>
          <ul>
            <li>l’auteur de chaque demande, la personne assignée, et les heures de création, de prise en charge et de résolution ;</li>
            <li>la dernière connexion de chaque compte ;</li>
            <li>l’heure de début du service de chaque employé.</li>
          </ul>
          <p>
            Il est interdit de contourner les contrôles d’accès, d’utiliser le compte d’un autre ou de modifier des données pour fausser les délais de traitement. Un manquement peut entraîner
            la désactivation du compte, sans préjudice des règles internes de l’hôtel.
          </p>
        </section>

        <section>
          <h2>6. Données personnelles</h2>
          <p>
            Les données traitées, leurs finalités et vos droits sont décrits dans la <Link href="/privacy">politique de confidentialité</Link>.
          </p>
        </section>
      </div>

      <footer className="legal-footer">
        <div>
          &copy; {new Date().getFullYear()} {HOTEL_NAME} • Hotel SES
        </div>
        <div>
          <Link href="/privacy">Politique de confidentialité</Link>
          <Link href="/login">Page de connexion</Link>
        </div>
      </footer>
    </LegalLayout>
  );
}
