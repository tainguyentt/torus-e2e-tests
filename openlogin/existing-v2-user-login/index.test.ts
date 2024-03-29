const { expect } = require('@playwright/test');
import { confirmEmail } from "../../utils";
import { test } from "./index.lib";

test('existing v2 user can log in correctly', async ({
  context,
  page,
  openloginURL,
  user
}) => {
  await page.goto(openloginURL);
  await page.click('button:has-text("Get Started")');

  // Login with Passwordless
  const timestamp = Math.floor(Date.now() / 1000);
  await page.fill('[placeholder="Email"]', user.email);
  await page.click('button:has-text("Continue with Email")');
  await page.waitForSelector("text=email has been sent");
  expect(await page.isVisible(`text=${user.email}`)).toBeTruthy();

  // Confirm email
  test.fixme(
    !(await confirmEmail({
      context,
      timestamp,
      to: user.email,
      resend: () => page.click("text=Resend"),
    }))
  );

  // Should be signed in in <2 minutes
  await page.waitForURL(`${openloginURL}/wallet/home`, {
    timeout: 2 * 60 * 1000,
  });

  // Go to Account page
  await Promise.all([page.waitForNavigation(), page.click("text=Account")]);
  expect(await page.isVisible(`text=${user.email}`)).toBeTruthy();

  // Logout
  await Promise.all([page.waitForNavigation(), page.click("text=Logout")]);
  expect(page.url()).toBe(`${openloginURL}/`);
});
