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

// Email functionality for appointment updates
async function sendAppointmentEmail(appointmentMessage) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: EMAIL_SENDER,
                pass: EMAIL_SENDER_PASS
            }
        });

        const mailOptions = {
            from: EMAIL_SENDER,
            to: EMAIL_RECEIVER,
            subject: 'VFS Appointment Status Update',
            text: `VFS Appointment Check Results:\n\n${appointmentMessage}\n\nTime: ${new Date().toLocaleString()}\n\nPlease check: https://visa.vfsglobal.com/aus/en/ind/dashboard`
        };

        await transporter.sendMail(mailOptions);
        console.log('✅ Appointment status email sent successfully');
    } catch (error) {
        console.error('❌ Failed to send appointment email:', error);
    }
}

// Original email functionality (keeping for backward compatibility)
async function sendEmail() {
    try {
        const transporter = nodemailer.createTransport({
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
    // Check if we're running in CI environment
    if (process.env.CI === 'true') {
        console.log('🤖 Running in CI environment - bypassing Turnstile solver API');
        return null;
    }

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
                
                // Wait a bit before clicking sign in to allow form to settle
                console.log('⏳ Waiting for form to settle before clicking Sign In...');
                await new Promise(resolve => setTimeout(resolve, 3000));
                
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
                    
                    // Wait longer after clicking sign in to see the dashboard loading
                    console.log('⏳ Waiting for login to process and dashboard to load...');
                    await new Promise(resolve => setTimeout(resolve, 5000));
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
    // Detect if running in CI environment
    const isCI = process.env.CI === 'true';
    console.log(`🖥️ Running in ${isCI ? 'CI (headless)' : 'local (visible)'} mode`);
    
    // Log environment info for debugging
    console.log('🔍 Environment info:');
    console.log(`- Node version: ${process.version}`);
    console.log(`- Platform: ${process.platform}`);
    console.log(`- Architecture: ${process.arch}`);
    console.log(`- Memory: ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`);
    
    let browser, page;
    
    try {
        console.log('🚀 Initializing browser connection...');
        
        // Retry browser connection with exponential backoff
        let connectionAttempts = 0;
        const maxConnectionAttempts = isCI ? 8 : 5;  // More retries for CI environment
        
        // Add initial delay in CI to let system settle
        if (isCI) {
            console.log('⏳ CI detected - waiting for system to settle...');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        while (connectionAttempts < maxConnectionAttempts) {
            try {
                connectionAttempts++;
                console.log(`🔄 Browser connection attempt ${connectionAttempts}/${maxConnectionAttempts}...`);
                
                const connection = await connect({
                    headless: isCI,  // Keep boolean headless for puppeteer-real-browser
                    args: [
                        "--no-sandbox",
                        "--disable-setuid-sandbox",
                        "--disable-dev-shm-usage",
                        "--disable-gpu",
                        "--disable-web-security",
                        "--disable-extensions",
                        "--no-first-run",
                        ...(isCI ? [
                            "--disable-background-timer-throttling",
                            "--disable-backgrounding-occluded-windows",
                            "--disable-renderer-backgrounding",
                            "--disable-features=TranslateUI,VizDisplayCompositor",
                            "--memory-pressure-off"
                        ] : [])
                    ],
                    customConfig: {
                        ...(process.env.PUPPETEER_EXECUTABLE_PATH ? {
                            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH
                        } : {})
                    },
                    turnstile: true,
                    connectOption: {
                        timeout: 180000,  // 3 minutes timeout for CI
                        ...(isCI ? {
                            defaultViewport: {
                                width: 1920,
                                height: 1080
                            }
                        } : {})
                    },
                    disableXvfb: false,  // Let puppeteer-real-browser handle Xvfb
                    ignoreAllFlags: false
                });
                
                browser = connection.browser;
                page = connection.page;
                
                console.log('✅ Browser connection established');
                break;
                
            } catch (error) {
                console.log(`❌ Browser connection attempt ${connectionAttempts} failed:`, error.message);
                
                // Try a simplified approach on the last attempt for CI
                if (connectionAttempts === maxConnectionAttempts && isCI) {
                    console.log('🔄 Trying simplified CI configuration as final attempt...');
                    try {
                        const connection = await connect({
                            headless: true,  // Boolean for puppeteer-real-browser
                            args: [
                                "--no-sandbox",
                                "--disable-setuid-sandbox",
                                "--disable-dev-shm-usage",
                                "--disable-gpu",
                                "--single-process"
                            ],
                            customConfig: {
                                ...(process.env.PUPPETEER_EXECUTABLE_PATH ? {
                                    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH
                                } : {})
                            },
                            turnstile: false,  // Disable turnstile for this attempt
                            connectOption: {
                                timeout: 60000
                            },
                            disableXvfb: false,
                            ignoreAllFlags: false
                        });
                        
                        browser = connection.browser;
                        page = connection.page;
                        console.log('✅ Browser connection established with simplified config');
                        break;
                    } catch (fallbackError) {
                        console.log('❌ Simplified configuration also failed:', fallbackError.message);
                    }
                }
                
                if (connectionAttempts >= maxConnectionAttempts) {
                    throw new Error(`Failed to establish browser connection after ${maxConnectionAttempts} attempts: ${error.message}`);
                }
                
                // Wait before retry with exponential backoff
                const waitTime = Math.min(Math.pow(2, connectionAttempts) * 1000, 10000); // Cap at 10 seconds
                console.log(`⏳ Waiting ${waitTime}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
        
        // Wait for the page to be fully ready before proceeding
        console.log('⏳ Waiting for page to be ready...');
        await page.waitForFunction(() => document.readyState === 'complete', { timeout: 30000 });
        
        // Additional wait to ensure frame is ready
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Set user agent
        console.log('🔧 Setting user agent...');
        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
            "AppleWebKit/537.36 (KHTML, like Gecko) " +
            "Chrome/116.0.0.0 Safari/537.36"
        );
        console.log('✅ User agent set');

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

        // Click "Start New Booking" button with improved retry logic
        console.log('🔘 Looking for "Start New Booking" button...');
        let bookingNavigationSuccess = false;
        
        for (let bookingAttempt = 1; bookingAttempt <= 5; bookingAttempt++) {
            try {
                console.log(`🔄 Start New Booking attempt ${bookingAttempt}/5...`);
                
                // Wait for button to be available
                await page.waitForSelector('button.mdc-button--raised .mdc-button__label', { timeout: 15000 });
                
                // Take screenshot before clicking
                await page.screenshot({ path: `booking_attempt_${bookingAttempt}.png`, fullPage: true });
                
                // Click the "Start New Booking" button
                await page.click('button.mdc-button--raised .mdc-button__label');
                console.log(`✅ Clicked "Start New Booking" button (attempt ${bookingAttempt})`);
                
                // Wait for navigation and check multiple conditions
                console.log('⏳ Waiting for navigation...');
                let navSuccess = false;
                
                for (let navCheck = 1; navCheck <= 20; navCheck++) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    const currentUrl = page.url();
                    
                    // Check URL change
                    if (!currentUrl.includes('/dashboard') || 
                        currentUrl.includes('application-detail') || 
                        currentUrl.includes('booking')) {
                        console.log(`✅ Navigation detected via URL: ${currentUrl}`);
                        navSuccess = true;
                        break;
                    }
                    
                    // Check for application form elements
                    try {
                        const centerDropdown = await page.$('mat-select[formcontrolname="centerCode"]');
                        if (centerDropdown) {
                            console.log('✅ Application form detected');
                            navSuccess = true;
                            break;
                        }
                    } catch (e) {}
                    
                    console.log(`⏳ Navigation check ${navCheck}/20...`);
                }
                
                if (navSuccess) {
                    bookingNavigationSuccess = true;
                    break;
                }
                
                console.log(`⚠️ Navigation failed on attempt ${bookingAttempt}`);
                
            } catch (error) {
                console.log(`❌ Booking attempt ${bookingAttempt} failed: ${error.message}`);
                await page.screenshot({ path: `booking_error_${bookingAttempt}.png`, fullPage: true });
            }
            
            if (bookingAttempt < 5) {
                console.log('⏳ Waiting before retry...');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        
        if (!bookingNavigationSuccess) {
            console.log('❌ Failed to navigate after Start New Booking');
            return;
        }
        
        // Additional stabilization wait
        console.log('⏳ Waiting for page to stabilize...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Take final screenshot
        await page.screenshot({ path: `application_page_ready.png`, fullPage: true });
        const finalUrl = page.url();
        console.log(`📍 Ready on URL: ${finalUrl}`);
        
        // Robust dropdown selection sequence
        async function selectDropdownOption(dropdownSelector, optionSelector, stepName, maxAttempts = 5) {
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    console.log(`🔄 ${stepName} - Attempt ${attempt}/${maxAttempts}`);
                    
                    // Wait for dropdown to be available
                    await page.waitForSelector(dropdownSelector, { timeout: 20000 });
                    console.log(`✅ Found ${stepName} dropdown`);
                    
                    // Take screenshot before
                    await page.screenshot({ path: `${stepName.toLowerCase().replace(/\s+/g, '_')}_before_${attempt}.png`, fullPage: true });
                    
                    // Click dropdown
                    await page.click(dropdownSelector);
                    console.log(`✅ Clicked ${stepName} dropdown`);
                    
                    // Wait for dropdown to open
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    // Wait for and click option
                    await page.waitForSelector(optionSelector, { timeout: 15000 });
                    await page.click(optionSelector);
                    console.log(`✅ Selected ${stepName} option`);
                    
                    // Wait for form to update
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    
                    // Take screenshot after
                    await page.screenshot({ path: `${stepName.toLowerCase().replace(/\s+/g, '_')}_completed_${attempt}.png`, fullPage: true });
                    
                    return true;
                    
                } catch (error) {
                    console.log(`❌ ${stepName} attempt ${attempt} failed: ${error.message}`);
                    await page.screenshot({ path: `${stepName.toLowerCase().replace(/\s+/g, '_')}_error_${attempt}.png`, fullPage: true });
                    
                    if (attempt < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }
                }
            }
            return false;
        }
        
        // Execute all dropdown selections
        console.log('🔽 Starting dropdown selection sequence...');
        
        // Step 1 & 2: Application Centre
        if (!await selectDropdownOption(
            'mat-select[formcontrolname="centerCode"]',
            'mat-option[id="INME"]',
            'Application Centre Selection'
        )) {
            console.log('❌ Failed to select Application Centre');
            return;
        }
        
        // Step 3 & 4: Appointment Category
        if (!await selectDropdownOption(
            'mat-select[formcontrolname="selectedSubvisaCategory"]',
            'mat-option[id="Passport"]',
            'Appointment Category Selection'
        )) {
            console.log('❌ Failed to select Appointment Category');
            return;
        }
        
        // Step 5 & 6: Sub-category
        if (!await selectDropdownOption(
            'mat-select[formcontrolname="visaCategoryCode"]',
            'mat-option[id="PassportADULT"]',
            'Sub Category Selection'
        )) {
            console.log('❌ Failed to select Sub-category');
            return;
        }
        
        console.log('✅ All dropdown selections completed successfully!');
        
        // Wait for appointment availability message to appear
        console.log('⏳ Waiting for appointment availability message...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Take screenshot of final result
        await page.screenshot({ path: `appointment_result.png`, fullPage: true });
        console.log('📸 Final result screenshot: appointment_result.png');
        
        // Check for appointment availability message
        let appointmentMessage = '';
        try {
            // Look for the specific alert div
            const alertSelector = '.alert.alert-info.border-0.rounded-0.alert-info-blue';
            const alertElement = await page.$(alertSelector);
            
            if (alertElement) {
                appointmentMessage = await page.evaluate(el => el.textContent.trim(), alertElement);
                console.log('📋 Appointment message found:', appointmentMessage);
            } else {
                // Try alternative selectors for appointment messages
                const alternativeSelectors = [
                    '.alert-info',
                    '.alert',
                    '[class*="alert"]',
                    'div:contains("appointment")',
                    'div:contains("slots")'
                ];
                
                for (const selector of alternativeSelectors) {
                    try {
                        const elements = await page.$$(selector);
                        for (const element of elements) {
                            const text = await page.evaluate(el => el.textContent.trim(), element);
                            if (text.toLowerCase().includes('appointment') || 
                                text.toLowerCase().includes('slots') || 
                                text.toLowerCase().includes('available')) {
                                appointmentMessage = text;
                                console.log(`📋 Appointment message found with selector ${selector}:`, appointmentMessage);
                                break;
                            }
                        }
                        if (appointmentMessage) break;
                    } catch (e) {
                        continue;
                    }
                }
            }
        } catch (error) {
            console.log('⚠️ Could not find appointment message:', error.message);
        }
        
        // If no specific message found, capture general page content about appointments
        if (!appointmentMessage) {
            try {
                const pageText = await page.evaluate(() => document.body.textContent);
                if (pageText.toLowerCase().includes('no appointment') || 
                    pageText.toLowerCase().includes('slots') ||
                    pageText.toLowerCase().includes('available')) {
                    // Extract relevant portion
                    const lines = pageText.split('\n');
                    for (const line of lines) {
                        if (line.toLowerCase().includes('appointment') || 
                            line.toLowerCase().includes('slots')) {
                            appointmentMessage = line.trim();
                            break;
                        }
                    }
                }
            } catch (error) {
                console.log('⚠️ Could not extract appointment info from page:', error.message);
            }
        }
        
        // Send email with appointment status
        if (appointmentMessage) {
            console.log('📧 Sending email with appointment status...');
            await sendAppointmentEmail(appointmentMessage);
        } else {
            appointmentMessage = 'VFS appointment check completed - please check the screenshots for details.';
            console.log('📧 Sending general notification email...');
            await sendAppointmentEmail(appointmentMessage);
        }
        
        console.log('✅ VFS appointment check completed successfully!');
        
        // Keep browser open for a bit to see the final result (only in local mode)
        if (!isCI) {
            console.log('⏳ Keeping browser open for 10 seconds to view final result...');
            await new Promise(resolve => setTimeout(resolve, 10000));
        } else {
            console.log('🤖 CI mode - closing browser immediately');
        }

    } catch (error) {
        console.error('❌ Error in main function:', error);
        // Take error screenshot
        try {
            if (page) {
                await page.screenshot({ path: `error_final.png`, fullPage: true });
                console.log('📸 Error screenshot saved: error_final.png');
            }
        } catch (screenshotError) {
            console.log('Failed to take error screenshot');
        }
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the main function
main().catch(console.error);
