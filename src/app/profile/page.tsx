import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ProfileForm from "@/components/profile-form";
import { getT } from "@/lib/i18n/server";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { t } = await getT();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, image: true, birthday: true, gender: true },
  });
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">{t("profile_title")}</h1>
      <ProfileForm
        initial={{
          name: user.name ?? "",
          email: user.email,
          image: user.image,
          birthday: user.birthday ? user.birthday.toISOString().slice(0, 10) : "",
          gender: user.gender ?? "",
        }}
      />
    </div>
  );
}
