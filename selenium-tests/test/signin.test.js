const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function runTest(name, testFn) {
    try {
        await testFn();
        console.log(`${name}: PASSED`);
    } catch {
        console.log(`${name}: FAILED`);
    }
}

(async function main() {
    const options = new chrome.Options()
        .addArguments(
            '--headless',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-logging',
            '--log-level=3',
            '--silent'
        );

    const driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();

    try {
        const baseUrl = 'http://localhost:3000/signin';

        // Suppress console logs inside the browser
        await driver.executeScript(`
            console.log = function() {};
            console.error = function() {};
            console.warn = function() {};
            console.info = function() {};
        `);

        await runTest('Regular user login', async () => {
            await driver.get(baseUrl);
            await driver.findElement(By.id('email')).sendKeys('user1@psg.in');
            await driver.findElement(By.id('password')).sendKeys('12345678');
            await driver.findElement(By.css('button[type="submit"]')).click();
            await driver.wait(until.urlIs('http://localhost:3000/user/dashboard'), 10000);
        });

        await runTest('Admin login', async () => {
            await driver.get(baseUrl);
            await driver.findElement(By.id('email')).sendKeys('admin@psg.in');
            await driver.findElement(By.id('password')).sendKeys('12345678');
            await driver.findElement(By.css('button[type="submit"]')).click();
            await driver.wait(until.urlIs('http://localhost:3000/admin/dashboard'), 10000);
        });

        await runTest('Invalid email', async () => {
            await driver.get(baseUrl);
            await driver.findElement(By.id('email')).sendKeys('nonexistent@example.com');
            await driver.findElement(By.id('password')).sendKeys('password123');
            await driver.findElement(By.css('button[type="submit"]')).click();
            const errorElement = await driver.wait(until.elementLocated(By.css('.alert.alert-danger')), 10000);
            const errorText = await errorElement.getText();
            if (!errorText.includes("doesn't exist")) throw new Error();
        });

        await runTest('Invalid password', async () => {
            await driver.get(baseUrl);
            await driver.findElement(By.id('email')).sendKeys('testuser@example.com');
            await driver.findElement(By.id('password')).sendKeys('wrongpassword');
            await driver.findElement(By.css('button[type="submit"]')).click();
            const errorElement = await driver.wait(until.elementLocated(By.css('.alert.alert-danger')), 10000);
            const errorText = await errorElement.getText();
            if (!errorText.includes("didn't match")) throw new Error();
        });

        await runTest('Empty form submission', async () => {
            await driver.get(baseUrl);
            await driver.findElement(By.css('button[type="submit"]')).click();
            const errorElement = await driver.wait(until.elementLocated(By.css('.alert.alert-danger')), 10000);
            const errorText = await errorElement.getText();
            if (!errorText.toLowerCase().includes('error')) throw new Error();
        });

        await runTest('Redirect if already authenticated', async () => {
            await driver.executeScript(
                'window.localStorage.setItem("jwt", JSON.stringify({ token: "mock-token", user: { _id: "123", role: 0 } }));'
            );
            await driver.get(baseUrl);
            await driver.wait(until.urlIs('http://localhost:3000/'), 10000);
        });

    } finally {
        await driver.quit();
    }
})();
