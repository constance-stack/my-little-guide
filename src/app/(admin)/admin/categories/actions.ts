"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function toggleCategoryForDestination(formData: FormData) {
  const destinationId = String(formData.get("destinationId"));
  const categoryId = String(formData.get("categoryId"));
  const enabled = formData.get("enabled") === "true";

  await prisma.destination.update({
    where: { id: destinationId },
    data: {
      categories: enabled
        ? { connect: { id: categoryId } }
        : { disconnect: { id: categoryId } },
    },
  });

  revalidatePath("/admin/categories");
}
