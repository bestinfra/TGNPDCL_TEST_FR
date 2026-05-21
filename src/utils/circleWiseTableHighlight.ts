/** Apply highlight class to the "All Circles" totals row in circle-wise tables. */
export function applyCircleWiseTotalsRowHighlight(
    hostSelector = ".circle-wise-stats-table-host",
): void {
    const host = document.querySelector(hostSelector);
    if (!host) return;

    host.querySelectorAll("tbody tr").forEach((tr) => {
        const circleCell = tr.querySelector('td[data-label="Circle"]');
        const label = circleCell?.textContent?.trim() ?? "";
        const isTotal = label === "All Circles";

        if (isTotal) {
            tr.classList.add("circle-wise-totals-row");
            tr.setAttribute("data-total-row", "true");
            const snoCell = tr.querySelector('td[data-label="S.No"]');
            if (snoCell) snoCell.textContent = "";
        } else {
            tr.classList.remove("circle-wise-totals-row");
            tr.removeAttribute("data-total-row");
        }
    });
}
