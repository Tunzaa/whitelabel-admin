import { useTranslation } from "react-i18next";
import {
  Edit,
  Eye,
  MoreHorizontal,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Can } from "@/components/auth/can";
import { Category } from "../types";

interface CategoryTableProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onToggleStatus?: (category: Category, isActive: boolean) => void;
  onViewDetails?: (category: Category) => void;
}

export function CategoryTable({
  categories,
  onEdit,
  onDelete,
  onToggleStatus,
  onViewDetails,
}: CategoryTableProps) {
  const { t } = useTranslation(["categories", "common"]);
  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-4 text-left">{t("table.columns.name")}</th>
            <th className="p-4 text-left">{t("table.columns.description")}</th>
            <th className="p-4 text-left">{t("table.columns.status")}</th>
            <th className="p-4 text-left">{t("table.columns.parent_category")}</th>
            <th className="p-4 text-left">{t("table.columns.image")}</th>
            <th className="p-4 text-right">{t("table.columns.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {categories.length === 0 ? (
            <tr className="border-b">
              <td colSpan={6} className="p-4 text-center text-muted-foreground">
                {t("table.empty_state")}
              </td>
            </tr>
          ) : (
            categories.map((category) => (
              <tr
                key={category.category_id}
                className="border-b hover:bg-muted/20"
              >
                <td className="p-4 font-medium">{category.name}</td>
                <td className="p-4 max-w-xs truncate">
                  {category.description || "-"}
                </td>
                <td className="p-4">
                  <Badge
                    variant={category.is_active ? "default" : "destructive"}
                    className={
                      category.is_active
                        ? "bg-green-500 hover:bg-green-600"
                        : ""
                    }
                  >
                    {category.is_active
                      ? t("status.active")
                      : t("status.inactive")}
                  </Badge>
                </td>
                <td className="p-4">
                  {category.parent_id && category.parent_id !== "none"
                    ? categories.find(
                        (c) => c.category_id === category.parent_id,
                      )?.name || "-"
                    : "-"}
                </td>
                <td className="p-4">
                  {category.image_url ? (
                    <div className="relative h-8 w-8 rounded overflow-hidden">
                      <img
                        src={category.image_url}
                        alt={category.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          // Replace broken image with placeholder
                          e.currentTarget.src =
                            "https://placehold.co/32?text=NA";
                        }}
                      />
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="p-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onViewDetails && (
                        <DropdownMenuItem
                          onClick={() => onViewDetails(category)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          <span>{t("actions.view")}</span>
                        </DropdownMenuItem>
                      )}
                      <Can permission="categories:update">
                        <DropdownMenuItem onClick={() => onEdit(category)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>{t("actions.edit")}</span>
                        </DropdownMenuItem>
                      </Can>
                      {onToggleStatus && (
                        <Can permission="categories:update">
                          <DropdownMenuItem
                            onClick={() =>
                              onToggleStatus(category, !category.is_active)
                            }
                          >
                            {category.is_active ? (
                              <>
                                <PowerOff className="mr-2 h-4 w-4" />
                                <span>{t("actions.deactivate")}</span>
                              </>
                            ) : (
                              <>
                                <Power className="mr-2 h-4 w-4" />
                                <span>{t("actions.activate")}</span>
                              </>
                            )}
                          </DropdownMenuItem>
                        </Can>
                      )}
                      <Can permission="categories:delete">
                        <Separator />
                        <DropdownMenuItem onClick={() => onDelete(category)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>{t("actions.delete")}</span>
                        </DropdownMenuItem>
                      </Can>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
