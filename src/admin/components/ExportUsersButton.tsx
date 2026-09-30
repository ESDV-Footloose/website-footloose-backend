import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@strapi/design-system";
import { Download } from "@strapi/icons";
import { useFetchClient, useNotification } from "@strapi/strapi/admin";

const USER_MODEL = "plugin::users-permissions.user";
const PAGE_SIZE = 100;
const DELIMITER = ",";

/** Fields that are never included in the export. */
const EXCLUDED_FIELDS = [
  "password",
  "resetPasswordToken",
  "confirmationToken",
  "documentId",
  "locale",
  "publishedAt",
];

type User = Record<string, unknown>;

/**
 * Fetches all users through the content manager.
 *
 * @param get The authenticated GET function of the admin fetch client.
 * @returns All users.
 */
const fetchAllUsers = async (
  get: ReturnType<typeof useFetchClient>["get"],
): Promise<User[]> => {
  const users: User[] = [];
  let page = 1;
  let pageCount = 1;

  do {
    const { data } = await get(
      `/content-manager/collection-types/${USER_MODEL}`,
      { params: { page, pageSize: PAGE_SIZE, sort: "id:asc" } },
    );

    users.push(...data.results);
    pageCount = data.pagination.pageCount;
    page += 1;
  } while (page <= pageCount);

  return users;
};

/**
 * Formats a single value as a CSV cell.
 * Values that Excel would run as a formula are prefixed with a quote.
 *
 * @param value The value to format.
 * @returns The escaped CSV cell.
 */
const toCsvCell = (value: unknown): string => {
  let text = value === null || value === undefined ? "" : String(value);

  const isFormula =
    /^[=@\t\r]/.test(text) ||
    (/^[+-]/.test(text) && !/^[+-][\d\s().-]*$/.test(text));
  if (isFormula) {
    text = `'${text}`;
  }

  return /["\r\n]/.test(text) || text.includes(DELIMITER)
    ? `"${text.replace(/"/g, '""')}"`
    : text;
};

/**
 * Converts users without relations to CSV.
 *
 * @param users The users to convert.
 * @returns The CSV file content.
 */
const toCsv = (users: User[]): string => {
  const columns: string[] = [];
  const nested = new Set<string>(EXCLUDED_FIELDS);

  for (const user of users) {
    for (const [field, value] of Object.entries(user)) {
      if (value !== null && typeof value === "object") {
        nested.add(field);
      } else if (!columns.includes(field)) {
        columns.push(field);
      }
    }
  }

  const header = columns.filter((field) => !nested.has(field));
  const rows = users.map((user) =>
    header.map((field) => toCsvCell(user[field])).join(DELIMITER),
  );

  return [header.join(DELIMITER), ...rows].join("\r\n");
};

/**
 * Lets the browser download the given CSV content as a file.
 *
 * @param csv The CSV file content.
 */
const downloadCsv = (csv: string): void => {
  // The BOM makes Excel read the file as UTF-8.
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();

  URL.revokeObjectURL(url);
};

/**
 * Button for the users screen that exports all users to a CSV file.
 */
export const ExportUsersButton = () => {
  const { slug } = useParams();
  const { get } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [isExporting, setIsExporting] = useState(false);

  if (slug !== USER_MODEL) return null;

  const handleExport = async () => {
    setIsExporting(true);

    try {
      downloadCsv(toCsv(await fetchAllUsers(get)));
    } catch {
      toggleNotification({
        type: "danger",
        message: "Exporting users failed, please try again.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="secondary"
      startIcon={<Download />}
      loading={isExporting}
      onClick={handleExport}
    >
      Export users
    </Button>
  );
};
