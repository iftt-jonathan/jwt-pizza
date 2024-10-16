import { test, expect } from "playwright-test-coverage";

test("purchase with login", async ({ page }) => {
  await page.route("*/**/api/order/menu", async (route) => {
    const menuRes = [
      {
        id: 1,
        title: "Veggie",
        image: "pizza1.png",
        price: 0.0038,
        description: "A garden of delight",
      },
      {
        id: 2,
        title: "Pepperoni",
        image: "pizza2.png",
        price: 0.0042,
        description: "Spicy treat",
      },
    ];
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: menuRes });
  });

  await page.route("*/**/api/franchise", async (route) => {
    const franchiseRes = [
      {
        id: 2,
        name: "LotaPizza",
        stores: [
          { id: 4, name: "Lehi" },
          { id: 5, name: "Springville" },
          { id: 6, name: "American Fork" },
        ],
      },
      { id: 3, name: "PizzaCorp", stores: [{ id: 7, name: "Spanish Fork" }] },
      { id: 4, name: "topSpot", stores: [] },
    ];
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: franchiseRes });
  });

  await page.route("*/**/api/auth", async (route) => {
    const loginReq = { email: "d@jwt.com", password: "a" };
    const loginRes = {
      user: {
        id: 3,
        name: "Kai Chen",
        email: "d@jwt.com",
        roles: [{ role: "diner" }],
      },
      token: "abcdef",
    };
    expect(route.request().method()).toBe("PUT");
    expect(route.request().postDataJSON()).toMatchObject(loginReq);
    await route.fulfill({ json: loginRes });
  });

  await page.route("*/**/api/order", async (route) => {
    const orderReq = {
      items: [
        { menuId: 1, description: "Veggie", price: 0.0038 },
        { menuId: 2, description: "Pepperoni", price: 0.0042 },
      ],
      storeId: "4",
      franchiseId: 2,
    };
    const orderRes = {
      order: {
        items: [
          { menuId: 1, description: "Veggie", price: 0.0038 },
          { menuId: 2, description: "Pepperoni", price: 0.0042 },
        ],
        storeId: "4",
        franchiseId: 2,
        id: 23,
      },
      jwt: "eyJpYXQ",
    };
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toMatchObject(orderReq);
    await route.fulfill({ json: orderRes });
  });

  await page.goto("/");

  // Go to order page
  await page.getByRole("button", { name: "Order now" }).click();

  // Create order
  await expect(page.locator("h2")).toContainText("Awesome is a click away");
  await page.getByRole("combobox").selectOption("4");
  await page.getByRole("link", { name: "Image Description Veggie A" }).click();
  await page.getByRole("link", { name: "Image Description Pepperoni" }).click();
  await expect(page.locator("form")).toContainText("Selected pizzas: 2");
  await page.getByRole("button", { name: "Checkout" }).click();

  // Login
  await page.getByPlaceholder("Email address").click();
  await page.getByPlaceholder("Email address").fill("d@jwt.com");
  await page.getByPlaceholder("Email address").press("Tab");
  await page.getByPlaceholder("Password").fill("a");
  await page.getByRole("button", { name: "Login" }).click();

  // Pay
  await expect(page.getByRole("main")).toContainText(
    "Send me those 2 pizzas right now!"
  );
  await expect(page.locator("tbody")).toContainText("Veggie");
  await expect(page.locator("tbody")).toContainText("Pepperoni");
  await expect(page.locator("tfoot")).toContainText("0.008 ₿");
  await page.getByRole("button", { name: "Pay now" }).click();

  // Check balance
  await expect(page.getByText("0.008")).toBeVisible();
});

test("create franchise as admin", async ({ page }) => {
  // login mock
  await page.route("*/**/api/auth", async (route) => {
    const loginReq = { email: "a@jwt.com", password: "admin" };
    const loginRes = {
      user: {
        id: 1,
        name: "常用名字",
        email: "@jwt.com",
        roles: [{ role: "admin" }],
      },
      token: "abcdef",
    };
    expect(route.request().method()).toBe("PUT");
    expect(route.request().postDataJSON()).toMatchObject(loginReq);
    await route.fulfill({ json: loginRes });
  });

  // franchise mock
  let getRes = [
    {
      id: 1,
      name: "pizzaPocket",
      admins: [{ id: 1, name: "常用名字", email: "a@jwt.com" }],
      stores: [
        { id: 1, name: "SLC", totalRevenue: 0.0082 },
        { id: 2, name: "Provo", totalRevenue: 0 },
      ],
    },
  ];

  await page.route("*/**/api/franchise", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: getRes });
    } else if (route.request().method() === "POST") {
      const postReq = {
        stores: [],
        name: "test franchise 1",
        admins: [{ email: "243jvjamh0@test.com" }],
      };
      const postRes = {
        stores: [],
        name: "test franchise 1",
        admins: [
          {
            email: "243jvjamh0@test.com",
            id: 4,
            name: "orderRouter test user",
          },
        ],
        id: 9,
      };
      expect(route.request().postDataJSON()).toMatchObject(postReq);
      getRes.push(postRes);
      await route.fulfill({ json: postRes });
    }
  });

  await page.goto("/");

  // Go to login page
  await page.getByRole("link", { name: "Login" }).click();

  // Login
  await page.getByPlaceholder("Email address").click();
  await page.getByPlaceholder("Email address").fill("a@jwt.com");
  await page.getByPlaceholder("Email address").press("Tab");
  await page.getByPlaceholder("Password").fill("admin");
  await page.getByRole("button", { name: "Login" }).click();

  // Create franchise
  await page.getByRole("link", { name: "Admin" }).click();
  await page.getByRole("button", { name: "Add Franchise" }).click();
  await page.getByPlaceholder("franchise name").click();
  await page.getByPlaceholder("franchise name").fill("test franchise 1");
  await page.getByPlaceholder("franchisee admin email").click();
  await page
    .getByPlaceholder("franchisee admin email")
    .fill("243jvjamh0@test.com");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(
    page.locator("tbody").filter({ hasText: "test franchise 1" })
  ).toContainText("test franchise 1");
});

// test("close franchise as admin", async ({ page }) => {
//   await page.goto('http://localhost:5173/');
//   await page.getByRole('link', { name: 'Login' }).click();
//   await page.getByPlaceholder('Email address').fill('a@jwt.com');
//   await page.getByPlaceholder('Email address').press('Tab');
//   await page.getByPlaceholder('Password').fill('admin');
//   await page.getByPlaceholder('Password').press('Enter');
//   await page.getByRole('button', { name: 'Login' }).click();
//   await page.getByRole('link', { name: 'Admin' }).click()
//   await page.getByPlaceholder('franchisee admin email').fill('243jvjamh0@test.com');
//   await page.getByPlaceholder('franchisee admin email').press('Enter');
//   await page.getByRole('button', { name: 'Create' }).click();
//   await page.getByRole('row', { name: 'test franchise 1 orderRouter' }).getByRole('button').click();
//   await page.getByRole('button', { name: 'Close' }).click();
//   await page.getByRole('link', { name: 'Logout' }).click();;
//   await page.getByRole('button', { name: 'Add Franchise' }).click();
//   await page.getByPlaceholder('franchise name').click();
//   await page.getByPlaceholder('franchise name').fill('test franchise 1');
//   await page.getByPlaceholder('franchisee admin email').click();
// });
