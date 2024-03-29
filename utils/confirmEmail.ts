import { BrowserContext } from "playwright";

interface Filter {
  [key: string]: string | number | undefined
}

const generateFilterStr = (filter: Filter) => {
  const filterItems = Object.entries(filter)
  return filterItems.reduce((filterStr, [filterName,filterVal], currIdx) => {
    if(filterVal === undefined) return filterStr

    const prefix = currIdx === 0 ? '' : '+'
    return filterStr + `${prefix}${filterName}:${filterVal}`
  }, '')
}

export async function confirmEmail({
  context,
  timestamp,
  to,
  resend,
}: {
  context: BrowserContext;
  timestamp: number;
  /**
   * Specify this property for passwordless tests since they
   * utilise the same email inbox and thus we need to filter
   * by recipient in order to click the correct magic link
   */
  to?: string;
  resend: () => Promise<void>;
}) {
  const page = await context.newPage();
  try {
    const mailFilterStr = generateFilterStr({
      from: 'torus',
      subject: '(verify+your+email)',
      after: timestamp,
      to
    })
    await page.goto(
      `https://mail.google.com/mail/u/0/#advanced-search/is_unread=true&query=${mailFilterStr}&isrefinement=true`
    );
    await page.waitForSelector("a[title='Gmail']", { state: "attached" });

    // Try click on the verify link
    const maxReloads = 20;
    let reloads = 0;
    while (reloads < maxReloads) {
      try {
        reloads++;
        await page.click('div[role="link"] >> text=Verify your email', {
          timeout: 2500,
        });
        break;
      } catch {
        if (reloads % 5 === 0) await resend();
        await page.reload();
      }
    }
    if (reloads >= maxReloads) return false;

    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      page.click(
        'table[role="content-container"] a:has-text("Confirm my email")'
      ),
    ]);
    await popup.waitForSelector("text=Done");
    await popup.close();

    return true;
  } catch {
    return false;
  } finally {
    await page.close();
  }
}

export default confirmEmail
