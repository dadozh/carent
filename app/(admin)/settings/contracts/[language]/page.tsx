import { isLocale } from "@/lib/i18n-config";
import { redirect } from "next/navigation";
import { ContractEditorPage } from "@/components/settings/contract-editor-page";

export default async function ContractEditorRoute({
  params,
}: {
  params: Promise<{ language: string }>;
}) {
  const { language } = await params;
  if (!isLocale(language)) redirect("/settings/contracts");
  return (
    <div className="flex flex-1 flex-col">
      <ContractEditorPage language={language} />
    </div>
  );
}
