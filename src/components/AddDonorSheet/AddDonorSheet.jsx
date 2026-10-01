import { useEffect, useState, useRef } from "react";

import BottomSheet from "../BottomSheet/BottomSheet";
import Button from "../Button/Button";

import ContributionRepository from "../../database/repositories/ContributionRepository";

import "./AddDonorSheet.css";
import useLanguage from "../../i18n/useLanguage";

function AddDonorSheet({
  isOpen,
  onClose,
  trip,
  donor = null,
  onSaved,
}) {
  const { t } = useLanguage();
  const [donorName, setDonorName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const savingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    if (donor) {
      setDonorName(donor.donorName || "");
      setAmount(String(donor.amount || ""));
      setNote(donor.donorNote || "");
    } else {
      setDonorName("");
      setAmount("");
      setNote("");
    }
    savingRef.current = false;
  }, [isOpen, donor]);

  const saveDonor = async () => {
    if (savingRef.current) return;

    if (!donorName.trim()) {
      alert(t("enterDonorName"));
      return;
    }

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      alert(t("enterValidAmount"));
      return;
    }

    savingRef.current = true;

    try {
      if (donor) {
        await ContributionRepository.updateDonation(donor.id, {
          donorName: donorName.trim(),
          donorNote: note.trim() || null,
          amount: numericAmount,
        });
      } else {
        await ContributionRepository.createDonation({
          tripId: trip.id,
          userId: trip.userId,
          donorName: donorName.trim(),
          donorNote: note.trim() || null,
          amount: numericAmount,
        });
      }

      await onSaved?.();
      onClose();
    } finally {
      savingRef.current = false;
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={donor ? t("editDonor") : t("addDonor")}
    >
      <div className="donor-sheet">
        <input
          className="sheet-input"
          placeholder={t("donorName")}
          value={donorName}
          onChange={(e) => setDonorName(e.target.value)}
        />

        <input
          className="sheet-input"
          type="number"
          placeholder={t("donationAmount")}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <input
          className="sheet-input"
          placeholder={t("donationNote")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <Button onClick={saveDonor}>
          {t("saveDonor")}
        </Button>
      </div>
    </BottomSheet>
  );
}

export default AddDonorSheet;
