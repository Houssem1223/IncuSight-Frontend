"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import ConfirmDialog from "@/src/components/dashboard/ConfirmDialog";
import { Button } from "@/src/components/ui/button";
import {
  FormActions,
  FormErrorMessage,
  FormField,
  FormInput,
} from "@/src/components/ui/forms";
import { useAuth } from "@/src/contexts/AuthContext";
import { useUsers } from "@/src/contexts/UserContext";
import { isValidEmail } from "@/src/lib/auth-validation";
import ChangePasswordForm from "./ChangePasswordForm";

// Comme pour le mot de passe, changer d'email incremente `authVersion` cote backend
// ET repasse le compte en non verifie : la session meurt immediatement et l'acces
// est bloque jusqu'a validation du nouveau lien. On l'annonce avant, pas apres.
const LOGOUT_DELAY_MS = 3000;

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article className="dashboard-card p-5">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-foreground-muted">{description}</p>
      <div className="mt-4">{children}</div>
    </article>
  );
}

export default function AccountSettings() {
  const { user, logout, loadProfile } = useAuth();
  const { updateMyProfile, deactivateMyAccount } = useUsers();
  const fieldPrefix = useId();
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");

  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState("");

  // Le profil vient d'AuthContext, qui le charge apres le montage : sans cette
  // synchronisation les champs resteraient vides au premier rendu.
  useEffect(() => {
    if (!user) {
      return;
    }

    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setEmail(user.email ?? "");
  }, [user]);

  useEffect(
    () => () => {
      if (logoutTimer.current) {
        clearTimeout(logoutTimer.current);
      }
    },
    [],
  );

  const currentEmail = (user?.email ?? "").trim().toLowerCase();
  const nextEmail = email.trim().toLowerCase();
  const emailWillChange = Boolean(nextEmail) && nextEmail !== currentEmail;

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileError("");
    setProfileMessage("");

    if (!firstName.trim() || !lastName.trim()) {
      setProfileError("Le prenom et le nom sont obligatoires.");
      return;
    }

    if (!isValidEmail(email.trim())) {
      setProfileError("Saisissez une adresse email valide.");
      return;
    }

    setIsSavingProfile(true);

    try {
      await updateMyProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      });

      if (emailWillChange) {
        setProfileMessage(
          "Adresse email mise a jour. Un lien de verification vient de vous etre envoye : votre session va se fermer et le compte restera bloque jusqu'a la validation.",
        );
        logoutTimer.current = setTimeout(() => void logout(), LOGOUT_DELAY_MS);
        return;
      }

      // AuthContext porte le profil affiche partout (en-tete, garde de role) : sans
      // rechargement, l'ecran afficherait l'ancien nom jusqu'au prochain refresh.
      await loadProfile();
      setProfileMessage("Profil mis a jour.");
    } catch (error) {
      setProfileError(
        error instanceof Error ? error.message : "Impossible de mettre a jour le profil.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDeactivate = async () => {
    setDeactivateError("");
    setIsDeactivating(true);

    try {
      await deactivateMyAccount();
      setIsDeactivateOpen(false);
      await logout();
    } catch (error) {
      setDeactivateError(
        error instanceof Error ? error.message : "Impossible de desactiver le compte.",
      );
      setIsDeactivating(false);
    }
  };

  return (
    <section className="motion-rise dashboard-surface p-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand-strong">
        Mon compte
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
        Parametres du compte
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-foreground-muted">
        Vos informations personnelles, votre mot de passe et la desactivation de votre
        acces.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <SettingsSection
          description="Ces informations identifient votre compte sur la plateforme."
          title="Informations personnelles"
        >
          <form className="space-y-4" onSubmit={(event) => void handleSaveProfile(event)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField htmlFor={`${fieldPrefix}-firstname`} label="Prenom" required>
                <FormInput
                  autoComplete="given-name"
                  id={`${fieldPrefix}-firstname`}
                  onChange={(event) => setFirstName(event.target.value)}
                  value={firstName}
                />
              </FormField>

              <FormField htmlFor={`${fieldPrefix}-lastname`} label="Nom" required>
                <FormInput
                  autoComplete="family-name"
                  id={`${fieldPrefix}-lastname`}
                  onChange={(event) => setLastName(event.target.value)}
                  value={lastName}
                />
              </FormField>
            </div>

            <FormField
              hint={
                emailWillChange
                  ? "Changer d'adresse ferme votre session et bloque le compte jusqu'a la verification du nouveau lien."
                  : undefined
              }
              htmlFor={`${fieldPrefix}-email`}
              label="Adresse email"
              required
            >
              <FormInput
                autoComplete="email"
                id={`${fieldPrefix}-email`}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
            </FormField>

            <FormErrorMessage message={profileError} />

            {profileMessage && (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {profileMessage}
              </p>
            )}

            <FormActions align="start">
              <Button disabled={isSavingProfile} type="submit">
                {isSavingProfile ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </FormActions>
          </form>
        </SettingsSection>

        <SettingsSection
          description="Vous serez deconnecte apres le changement, toutes vos sessions etant revoquees."
          title="Mot de passe"
        >
          <ChangePasswordForm />
        </SettingsSection>
      </div>

      <article className="dashboard-card mt-4 border-red-200 p-5">
        <h2 className="text-base font-semibold text-red-800">Desactiver mon compte</h2>
        <p className="mt-1 max-w-2xl text-sm text-foreground-muted">
          Votre acces est immediatement revoque. Vos donnees et vos candidatures sont
          conservees : seul un administrateur peut reactiver le compte.
        </p>

        {deactivateError && (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {deactivateError}
          </p>
        )}

        <div className="mt-4">
          <Button
            onClick={() => setIsDeactivateOpen(true)}
            type="button"
            variant="outline"
          >
            Desactiver mon compte
          </Button>
        </div>
      </article>

      <ConfirmDialog
        confirmLabel="Desactiver"
        description="Votre acces sera revoque immediatement et vous serez deconnecte. Seul un administrateur pourra reactiver ce compte."
        isConfirming={isDeactivating}
        isOpen={isDeactivateOpen}
        onCancel={() => {
          if (!isDeactivating) {
            setIsDeactivateOpen(false);
          }
        }}
        onConfirm={() => void handleDeactivate()}
        title="Desactiver votre compte ?"
        tone="danger"
      />
    </section>
  );
}
