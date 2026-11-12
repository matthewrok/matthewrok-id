const { test, expect } = require("@playwright/test");

test("City Hall Requirements header and hero are cleaned without changing the page content", async ({ request }) => {
  const response = await request.get("/requirements-city-hall.html");
  expect(response.ok()).toBeTruthy();
  const html = await response.text();

  expect(html).toContain('class="brand"');
  expect(html).toContain("MATTHEW JOKI");
  expect(html).not.toContain("DRAGON KINGDOM");
  expect(html).toContain("RISE OF KINGDOMS · BUILDING GUIDE");
  expect(html).toContain("CITY HALL");
  expect(html).toContain("REQUIREMENTS");

  const cssResponse = await request.get("/assets/css/requirements.css");
  expect(cssResponse.ok()).toBeTruthy();
  const css = await cssResponse.text();
  expect(css).not.toContain("requirementsSerpent");
  expect(css).not.toContain(".hero::after");
  expect(css).not.toContain("@keyframes requirementsSerpent");
  expect(css).not.toContain(".brand small");
});
