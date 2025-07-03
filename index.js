const { connect } = require("puppeteer-real-browser");
const https = require('https');
const url = require('url');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Environment variables (create a .env file with these)
const VFS_EMAIL = process.env.VFS_EMAIL;
const VFS_PASSWORD = process.env.VFS_PASSWORD;
const EMAIL_SENDER = process.env.EMAIL_SENDER;
const EMAIL_SENDER_PASS = process.env.EMAIL_SENDER_PASS;
const EMAIL_RECEIVER = process.env.EMAIL_RECEIVER;

const MAX_RETRIES = 10;

// Email functionality
async function sendEmail() {
    try {
        const transporter = nodemailer.createTransporter({
            service: 'gmail',
            auth: {
                user: EMAIL_SENDER,
                pass: EMAIL_SENDER_PASS
            }
        });

        const mailOptions = {
            from: EMAIL_SENDER,
            to: EMAIL_RECEIVER,
            subject: 'VFS Appointment Available',
            text: 'Appointments may be available! Go check https://visa.vfsglobal.com/aus/en/ind/dashboard'
        };

        await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully');
    } catch (error) {
        console.error('❌ Failed to send email:', error);
    }
}

// Turnstile solver API integration
async function solveTurnstileWithAPI(pageUrl, siteKey) {
    return new Promise((resolve, reject) => {
        const apiUrl = `http://127.0.0.1:5000/turnstile?url=${pageUrl}&sitekey=${siteKey}`;
        console.log(`📡 Sending GET request to Turnstile Solver API: ${apiUrl}`);

        https.get(apiUrl, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.token) {
                        console.log('✅ Turnstile Solver returned a token.');
                        resolve(response.token);
                    } else {
                        console.log('❌ No token received from solver.');
                        resolve(null);
                    }
                } catch (error) {
                    console.error('❌ Failed to parse API response:', error);
                    resolve(null);
                }
            });
        }).on('error', (error) => {
            console.error(`❌ Failed to solve Turnstile captcha: ${error}`);
            resolve(null);
        });
    });
}

// Smart login function with retry logic
async function smartLogin(page) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        console.log(`🔁 Attempt ${attempt} to reach login page...`);
        
        try {
            // Navigate to login page with multiple wait conditions
            console.log('🌐 Navigating to VFS login page...');
            await page.goto('https://visa.vfsglobal.com/aus/en/ind/login', { 
                waitUntil: 'domcontentloaded',
                timeout: 90000 
            });
            
            // Wait a bit for page to fully render
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const currentUrl = page.url();
            console.log(`📍 Current URL: ${currentUrl}`);

            if (currentUrl.includes('page-not-found')) {
                console.log('⚠️ Redirected to page-not-found, retrying...');
                continue;
            }

            // Take screenshot first for debugging
            await page.screenshot({ path: `login_attempt_${attempt}.png`, fullPage: true });
            console.log(`📸 Screenshot saved: login_attempt_${attempt}.png`);

            // Cookie handling - use specific ID
            console.log('🍪 Looking for cookie consent...');
            try {
                await page.waitForSelector('#onetrust-accept-btn-handler', { timeout: 20000 });
                await page.click('#onetrust-accept-btn-handler');
                console.log('✅ Clicked "Accept All Cookies" button');
                await new Promise(resolve => setTimeout(resolve, 2000));
                // Take screenshot after clicking cookies
                await page.screenshot({ path: `cookies_accepted_${attempt}.png`, fullPage: true });
            } catch (error) {
                console.log('ℹ️ No "Accept All Cookies" button found or already handled.');
            }

            // Wait for page to settle after cookie handling
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Wait for login fields with more robust checking
            console.log('⏳ Waiting for login form to appear...');
            
            // Try to wait for either the login form or check if we're already logged in
            try {
                await Promise.race([
                    page.waitForSelector('input[formcontrolname="username"]', { timeout: 30000 }),
                    page.waitForSelector('.dashboard', { timeout: 30000 }).then(() => {
                        throw new Error('Already logged in');
                    })
                ]);
                
                await page.waitForSelector('input[formcontrolname="password"]', { timeout: 10000 });
                console.log('✅ Found login fields.');
                
                // Take another screenshot after finding login form
                await page.screenshot({ path: `login_form_found_${attempt}.png`, fullPage: true });
                
                // Fill in the login form
                console.log('📝 Filling login credentials...');
                await page.type('input[formcontrolname="username"]', VFS_EMAIL);
                await page.type('input[formcontrolname="password"]', VFS_PASSWORD);
                console.log('✅ Login credentials filled.');
                
                // Take screenshot after filling form
                await page.screenshot({ path: `form_filled_${attempt}.png`, fullPage: true });
                
                // Click the Sign In button
                console.log('🔘 Looking for Sign In button...');
                try {
                    // Wait for the specific Material Design Sign In button
                    await page.waitForSelector('button.mdc-button--outlined .mdc-button__label', { timeout: 10000 });
                    
                    // Take screenshot before clicking
                    await page.screenshot({ path: `before_signin_click_${attempt}.png`, fullPage: true });
                    
                    // Click the Sign In button
                    await page.click('button.mdc-button--outlined .mdc-button__label');
                    console.log('✅ Clicked Sign In button');
                    
                    // Take screenshot after clicking
                    await page.screenshot({ path: `after_signin_click_${attempt}.png`, fullPage: true });
                    
                    // Wait for login to process and redirect
                    console.log('⏳ Waiting for login to process...');
                    await page.waitForFunction(
                        () => window.location.href.includes('dashboard') || window.location.href.includes('error') || document.querySelector('.error, .alert-danger'),
                        { timeout: 60000 }
                    );
                    
                    // Take final screenshot after login attempt
                    await page.screenshot({ path: `login_result_${attempt}.png`, fullPage: true });
                    
                    const finalUrl = page.url();
                    console.log(`📍 Final URL after login: ${finalUrl}`);
                    
                    if (finalUrl.includes('dashboard')) {
                        console.log('✅ Login successful - redirected to dashboard!');
                        return true;
                    } else {
                        console.log('⚠️ Login may have failed - not on dashboard');
                        // Continue to next attempt
                        continue;
                    }
                    
                } catch (error) {
                    console.log(`❌ Sign In button click failed: ${error.message}`);
                    await page.screenshot({ path: `signin_error_${attempt}.png`, fullPage: true });
                    continue;
                }
                
            } catch (error) {
                if (error.message === 'Already logged in') {
                    console.log('✅ Already logged in, proceeding to dashboard...');
                    return true;
                }
                throw error;
            }

            } catch (error) {
                console.log(`⚠️ Login page loading attempt ${attempt} failed:`, error.message);
                
                // Take screenshot on error for debugging
                try {
                    await page.screenshot({ path: `login_error_${attempt}.png`, fullPage: true });
                    console.log(`� Error screenshot saved: login_error_${attempt}.png`);
                } catch (screenshotError) {
                    console.log('Failed to take error screenshot:', screenshotError.message);
                }
                
                // Wait before retry
                if (attempt < MAX_RETRIES) {
                    console.log('⏳ Waiting before retry...');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
        }

        console.log('❌ All login page loading attempts failed.');
        return false;
}

// Main function
async function main() {
    const { browser, page } = await connect({
        headless: false,
        args: ["--disable-blink-features=AutomationControlled"],
        customConfig: {},
        turnstile: true,
        connectOption: {},
        disableXvfb: true,
        ignoreAllFlags: false
    });

    try {
        // Set user agent
        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
            "AppleWebKit/537.36 (KHTML, like Gecko) " +
            "Chrome/116.0.0.0 Safari/537.36"
        );

        if (!(await smartLogin(page))) {
            console.log('❌ Failed to complete login process after retries.');
            return;
        }

        console.log('✅ Login successful! Now proceeding to dashboard...');

        // Wait for successful login and dashboard redirect
        await page.waitForFunction(
            () => window.location.href.includes('dashboard'),
            { timeout: 60000 }
        );

        // Take screenshot of dashboard
        await page.screenshot({ path: `dashboard_loaded.png`, fullPage: true });
        console.log('📸 Dashboard screenshot saved: dashboard_loaded.png');

        // Click "Start New Booking" button
        console.log('🔘 Looking for "Start New Booking" button...');
        try {
            // Wait for the specific Material Design "Start New Booking" button
            await page.waitForSelector('button.mdc-button--raised .mdc-button__label', { timeout: 15000 });
            
            // Take screenshot before clicking
            await page.screenshot({ path: `before_start_booking_click.png`, fullPage: true });
            console.log('📸 Screenshot before clicking Start New Booking: before_start_booking_click.png');
            
            // Click the "Start New Booking" button
            await page.click('button.mdc-button--raised .mdc-button__label');
            console.log('✅ Clicked "Start New Booking" button');
            
            // Take screenshot after clicking
            await page.screenshot({ path: `after_start_booking_click.png`, fullPage: true });
            console.log('📸 Screenshot after clicking Start New Booking: after_start_booking_click.png');
            
            // Wait for navigation to application detail page with retries
            console.log('⏳ Waiting for navigation to application detail page...');
            let navigationSuccess = false;
            
            for (let navAttempt = 1; navAttempt <= 3; navAttempt++) {
                try {
                    console.log(`🔄 Navigation attempt ${navAttempt}/3...`);
                    
                    await page.waitForFunction(
                        () => window.location.href.includes('application-detail') || 
                              window.location.href.includes('booking') ||
                              document.querySelector('mat-select[formcontrolname="centerCode"]'),
                        { timeout: 20000 }
                    );
                    
                    const currentUrl = page.url();
                    console.log(`📍 Current URL after wait: ${currentUrl}`);
                    
                    if (currentUrl.includes('application-detail') || currentUrl.includes('booking')) {
                        navigationSuccess = true;
                        break;
                    } else {
                        console.log(`⚠️ Navigation attempt ${navAttempt} - unexpected URL: ${currentUrl}`);
                        await page.screenshot({ path: `nav_attempt_${navAttempt}.png`, fullPage: true });
                        
                        if (navAttempt < 3) {
                            console.log('🔄 Retrying navigation...');
                            await new Promise(resolve => setTimeout(resolve, 3000));
                        }
                    }
                    
                } catch (error) {
                    console.log(`⚠️ Navigation attempt ${navAttempt} failed: ${error.message}`);
                    await page.screenshot({ path: `nav_error_${navAttempt}.png`, fullPage: true });
                    
                    if (navAttempt < 3) {
                        console.log('🔄 Retrying navigation...');
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }
                }
            }
            
            if (!navigationSuccess) {
                console.log('❌ Failed to navigate to application detail page after 3 attempts');
                await page.screenshot({ path: `navigation_failed.png`, fullPage: true });
                return;
            }
            
            // Take screenshot of application detail page
            await page.screenshot({ path: `application_detail_loaded.png`, fullPage: true });
            console.log('📸 Application detail page screenshot: application_detail_loaded.png');
            
            const currentUrl = page.url();
            console.log(`📍 Current URL: ${currentUrl}`);
            
            if (currentUrl.includes('application-detail')) {
                console.log('✅ Successfully navigated to application detail page!');
                console.log('🎯 Ready for next instructions on the application detail page...');
                
                // Handle Application Centre selection
                console.log('🔽 Selecting Application Centre...');
                try {
                    // Wait for the application center dropdown to be available
                    await page.waitForSelector('mat-select[formcontrolname="centerCode"]', { timeout: 15000 });
                    
                    // Take screenshot before clicking dropdown
                    await page.screenshot({ path: `before_center_dropdown_click.png`, fullPage: true });
                    console.log('📸 Screenshot before clicking center dropdown: before_center_dropdown_click.png');
                    
                    // Click the application center dropdown
                    await page.click('mat-select[formcontrolname="centerCode"]');
                    console.log('✅ Clicked application center dropdown');
                    
                    // Wait a moment for dropdown to open
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Take screenshot after dropdown opens
                    await page.screenshot({ path: `center_dropdown_opened.png`, fullPage: true });
                    console.log('📸 Screenshot with dropdown opened: center_dropdown_opened.png');
                    
                    // Wait for and click the Melbourne option
                    await page.waitForSelector('mat-option[id="INME"]', { timeout: 10000 });
                    await page.click('mat-option[id="INME"]');
                    console.log('✅ Selected "India Passport and Visa Services Center-Melbourne"');
                    
                    // Wait for dropdown to close
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Take screenshot after selection
                    await page.screenshot({ path: `center_selected.png`, fullPage: true });
                    console.log('📸 Screenshot after center selection: center_selected.png');
                    
                } catch (error) {
                    console.log(`❌ Application center selection failed: ${error.message}`);
                    await page.screenshot({ path: `center_selection_error.png`, fullPage: true });
                    console.log('📸 Error screenshot: center_selection_error.png');
                    return;
                }
                
            } else {
                console.log('⚠️ Unexpected page - not on application detail');
                await page.screenshot({ path: `unexpected_page.png`, fullPage: true });
                console.log('📸 Unexpected page screenshot: unexpected_page.png');
            }
            
        } catch (error) {
            console.log(`❌ Start New Booking button click failed: ${error.message}`);
            await page.screenshot({ path: `start_booking_error.png`, fullPage: true });
            console.log('📸 Error screenshot: start_booking_error.png');
            return;
        }

        // TODO: Wait for further instructions on the application detail page
        console.log('✅ Reached application detail page. Awaiting next instructions...');

    } catch (error) {
        console.error('❌ Error in main function:', error);
    } finally {
        await browser.close();
    }
}

// Run the main function
main().catch(console.error);
