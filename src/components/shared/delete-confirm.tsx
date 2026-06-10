"use client";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAppStore } from "@/store/app-store";
import { db } from "@/lib/db";
import { toast } from "sonner";

export function DeleteConfirmDialog() {
  const { deleteWordId, setDeleteWordId } = useAppStore();

  const handleDelete = async () => {
    if (!deleteWordId) return;
    try {
      await db.wordTags.where('wordId').equals(deleteWordId).delete();
      await db.trainingRecords.where('wordId').equals(deleteWordId).delete();
      await db.words.delete(deleteWordId);
      toast.success("Слово удалено");
    } catch {
      toast.error("Ошибка при удалении");
    }
    setDeleteWordId(null);
  };

  return (
    <AlertDialog open={!!deleteWordId} onOpenChange={(open) => !open && setDeleteWordId(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить слово?</AlertDialogTitle>
          <AlertDialogDescription>
            Это действие нельзя отменить. Слово будет удалено из вашего словаря вместе со всей статистикой тренировок.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
            Удалить
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
