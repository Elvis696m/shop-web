/* ==========================================
   SHOPWEB MANAGEMENT SYSTEM
   Complete Frontend JavaScript
   Storage: localStorage
========================================== */

"use strict";

// ==========================================
// 1. STORAGE CONFIGURATION
// ==========================================

const STORAGE = {
    products: "shopWebProducts",
    sales: "shopWebSales",
    movements: "shopWebMovements",
    customers: "shopWebCustomers",
    employees: "shopWebEmployees",
    expenses: "shopWebExpenses",
    settings: "shopWebSettings"
};

const $ = selector => document.querySelector(selector);

function read(key, fallback = []) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return value === null ? fallback : value;
    } catch (error) {
        console.error("Storage error:", error);
        return fallback;
    }
}

function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function getProducts() {
    return read(STORAGE.products, []);
}

function getSales() {
    return read(STORAGE.sales, []);
}

function getMovements() {
    return read(STORAGE.movements, []);
}

function getCustomers() {
    return read(STORAGE.customers, []);
}

function getEmployees() {
    return read(STORAGE.employees, []);
}

function getExpenses() {
    return read(STORAGE.expenses, []);
}

function getSettings() {
    return read(STORAGE.settings, {
        shopName: "My Shop",
        shopPhone: "",
        shopLocation: "",
        currency: "KSh"
    });
}

function uid() {
    return Date.now() + "-" + Math.random().toString(16).slice(2, 8);
}

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

function money(value) {
    const currency = getSettings().currency || "KSh";

    return `${currency} ${Number(value || 0).toLocaleString(
        "en-KE",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    )}`;
}

function safe(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function sum(items, callback) {
    return items.reduce(
        (total, item) => total + Number(callback(item) || 0),
        0
    );
}

function setMessage(selector, message, success = false) {
    const element = $(selector);

    if (!element) return;

    element.textContent = message;

    element.style.color = success
        ? "#16a34a"
        : "#dc2626";
}

function emptyRow(columns, message) {
    return `
        <tr>
            <td colspan="${columns}">
                ${safe(message)}
            </td>
        </tr>
    `;
}

function dateText(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleString();
}

function isSameDay(date, day = todayISO()) {
    return String(date).slice(0, 10) === day;
}

function isBetween(date, start, end) {
    const value = String(date).slice(0, 10);

    return (!start || value >= start) &&
           (!end || value <= end);
}


// ==========================================
// 2. NAVIGATION
// ==========================================

const menuBtn = $("#menuBtn");
const sideBar = $("#sideBar");

menuBtn.addEventListener("click", () => {

    sideBar.classList.toggle("hidden");

    menuBtn.setAttribute(
        "aria-expanded",
        String(!sideBar.classList.contains("hidden"))
    );

});

document.querySelectorAll("#sideBar nav a").forEach(link => {

    link.addEventListener("click", event => {

        event.preventDefault();

        const target = link.getAttribute("href").slice(1);

        document.querySelectorAll(".page").forEach(page => {

            page.classList.toggle(
                "active",
                page.id === target
            );

        });

        document.querySelectorAll("#sideBar nav a").forEach(item => {

            item.classList.toggle(
                "active-link",
                item === link
            );

        });

        history.replaceState(null, "", `#${target}`);

        refreshPage(target);

        if (window.innerWidth < 750) {
            sideBar.classList.add("hidden");
        }

    });

});

function refreshPage(id) {

    const actions = {

        dashboard: renderDashboard,

        pos: () => {
            loadPOSOptions();
            renderCart();
            renderSalesHistory();
        },

        products: () => {
            renderProducts();
            renderProductSummary();
        },

        inventory: () => {
            loadRestockOptions();
            renderInventory();
        },

        customers: renderCustomers,

        employees: renderEmployees,

        expenses: renderExpenses,

        reports: runReport,

        settings: loadSettingsForm

    };

    if (actions[id]) {
        actions[id]();
    }

}


// ==========================================
// 3. PRODUCT MANAGEMENT
// ==========================================

const productForm = $("#productForm");

$("#addProductBtn").addEventListener("click", () => {

    productForm.classList.remove("hidden");

    productForm.reset();

    $("#editingProductId").value = "";

    $("#productFormTitle").textContent = "Register Product";

    setMessage("#formMessage", "");

    productForm.scrollIntoView({
        behavior: "smooth"
    });

});

$("#cancelProductBtn").addEventListener("click", () => {

    productForm.reset();

    productForm.classList.add("hidden");

});

productForm.addEventListener("submit", event => {

    event.preventDefault();

    const products = getProducts();

    const editId = $("#editingProductId").value;

    const name = $("#productName").value.trim();

    const category = $("#productCategory").value.trim();

    const buying = Number($("#buyingPrice").value);

    const selling = Number($("#sellingPrice").value);

    const quantity = Number($("#productStock").value);

    const minimum = Number($("#minimumStock").value);

    if (
        !name ||
        !category ||
        buying <= 0 ||
        selling <= 0 ||
        !Number.isInteger(quantity) ||
        quantity < 0 ||
        !Number.isInteger(minimum) ||
        minimum < 0
    ) {

        setMessage(
            "#formMessage",
            "Please enter valid product details."
        );

        return;

    }

    if (editId) {

        const product = products.find(
            item => String(item.id) === String(editId)
        );

        if (!product) return;

        product.name = name;
        product.category = category;
        product.buyingPrice = buying;
        product.sellingPrice = selling;
        product.minimumStock = minimum;

        setMessage(
            "#formMessage",
            "Product details updated. Use Inventory to change stock.",
            true
        );

    } else {

        const product = {

            id: uid(),

            name,

            category,

            buyingPrice: buying,

            sellingPrice: selling,

            quantity,

            minimumStock: minimum,

            active: true,

            createdAt: new Date().toISOString()

        };

        products.push(product);

        if (quantity > 0) {

            const movements = getMovements();

            movements.unshift({

                id: uid(),

                date: new Date().toISOString(),

                productId: product.id,

                productName: name,

                type: "Opening stock",

                quantity,

                unitCost: buying,

                note: "Initial product registration"

            });

            write(STORAGE.movements, movements);

        }

        setMessage(
            "#formMessage",
            "Product saved successfully.",
            true
        );

    }

    write(STORAGE.products, products);

    productForm.reset();

    $("#editingProductId").value = "";

    renderProducts();

    renderProductSummary();

    renderDashboard();

    loadPOSOptions();

    loadRestockOptions();

    if (!editId) {
        productForm.classList.add("hidden");
    }

});

$("#searchProduct").addEventListener("input", renderProducts);

function renderProducts() {

    const body = $("#productTableBody");

    const query = $("#searchProduct").value
        .trim()
        .toLowerCase();

    const products = getProducts()
        .filter(product => product.active !== false)
        .filter(product =>
            `${product.name} ${product.category}`
                .toLowerCase()
                .includes(query)
        );

    $("#productCountLabel").textContent =
        `${products.length} product(s)`;

    if (!products.length) {

        body.innerHTML = emptyRow(9, "No products found.");

        return;

    }

    body.innerHTML = products.map(product => {

        const unitProfit =
            Number(product.sellingPrice) -
            Number(product.buyingPrice);

        const margin = Number(product.sellingPrice) > 0
            ? unitProfit / Number(product.sellingPrice) * 100
            : 0;

        const low =
            Number(product.quantity) <=
            Number(product.minimumStock);

        return `

            <tr>

                <td>${safe(product.name)}</td>

                <td>${safe(product.category)}</td>

                <td>${money(product.buyingPrice)}</td>

                <td>${money(product.sellingPrice)}</td>

                <td class="${unitProfit < 0 ? "negative" : "positive"}">
                    ${money(unitProfit)}
                </td>

                <td>${margin.toFixed(2)}%</td>

                <td>${Number(product.quantity)}</td>

                <td class="${low ? "stock-low" : "stock-good"}">
                    ${low ? "Low stock" : "In stock"}
                </td>

                <td>

                    <button
                        class="edit-btn"
                        data-edit-product="${safe(product.id)}">
                        Edit
                    </button>

                    <button
                        class="delete-btn"
                        data-archive-product="${safe(product.id)}">
                        Archive
                    </button>

                </td>

            </tr>

        `;

    }).join("");

}

$("#productTableBody").addEventListener("click", event => {

    const edit = event.target.closest("[data-edit-product]");

    const archive = event.target.closest("[data-archive-product]");

    if (edit) {

        const product = getProducts().find(
            item => String(item.id) === edit.dataset.editProduct
        );

        if (!product) return;

        $("#editingProductId").value = product.id;

        $("#productName").value = product.name;

        $("#productCategory").value = product.category;

        $("#buyingPrice").value = product.buyingPrice;

        $("#sellingPrice").value = product.sellingPrice;

        $("#productStock").value = product.quantity;

        $("#minimumStock").value = product.minimumStock;

        $("#productFormTitle").textContent = "Edit Product Details";

        productForm.classList.remove("hidden");

        productForm.scrollIntoView({
            behavior: "smooth"
        });

    }

    if (archive) {

        const products = getProducts();

        const product = products.find(
            item => String(item.id) === archive.dataset.archiveProduct
        );

        if (!product) return;

        if (!confirm(`Archive ${product.name}?`)) return;

        product.active = false;

        write(STORAGE.products, products);

        renderProducts();

        renderProductSummary();

        loadPOSOptions();

        loadRestockOptions();

        renderDashboard();

    }

});

function renderProductSummary() {

    const products = getProducts()
        .filter(product => product.active !== false);

    $("#totalProducts").textContent = products.length;

    $("#inventoryValue").textContent = money(
        sum(products, product =>
            Number(product.quantity) *
            Number(product.buyingPrice)
        )
    );

    $("#potentialProfit").textContent = money(
        sum(products, product =>
            Number(product.quantity) *
            (
                Number(product.sellingPrice) -
                Number(product.buyingPrice)
            )
        )
    );

}


// ==========================================
// 4. POINT OF SALE
// ==========================================

let cart = [];

function loadPOSOptions() {

    const select = $("#posProduct");

    const current = select.value;

    select.innerHTML = `
        <option value="">Choose a product</option>
    `;

    getProducts()
        .filter(product =>
            product.active !== false &&
            Number(product.quantity) > 0
        )
        .forEach(product => {

            const option = document.createElement("option");

            option.value = product.id;

            option.textContent =
                `${product.name} — ${money(product.sellingPrice)} (${product.quantity} available)`;

            select.appendChild(option);

        });

    if ([...select.options].some(option => option.value === current)) {
        select.value = current;
    }

    const customerSelect = $("#posCustomer");

    const selected = customerSelect.value;

    customerSelect.innerHTML =
        '<option value="">Walk-in customer</option>' +
        getCustomers().map(customer => `
            <option value="${safe(customer.id)}">
                ${safe(customer.name)}
            </option>
        `).join("");

    customerSelect.value = selected;

}

$("#posProduct").addEventListener("change", () => {

    const product = getProducts().find(
        item => String(item.id) === $("#posProduct").value
    );

    if (!product) {

        $("#posProductInfo").textContent =
            "Select a product to see its price and available stock.";

        return;

    }

    $("#posProductInfo").innerHTML = `

        <strong>${safe(product.name)}</strong>

        <br>

        Selling price: ${money(product.sellingPrice)}

        <br>

        Available stock: ${Number(product.quantity)}

    `;

});

$("#addToCartBtn").addEventListener("click", () => {

    const id = $("#posProduct").value;

    const quantity = Number($("#posQuantity").value);

    const product = getProducts().find(
        item => String(item.id) === String(id)
    );

    if (!product) {

        setMessage("#posMessage", "Please select a product.");

        return;

    }

    if (!Number.isInteger(quantity) || quantity < 1) {

        setMessage("#posMessage", "Enter a valid whole-number quantity.");

        return;

    }

    const existing = cart.find(
        item => String(item.productId) === String(id)
    );

    const quantityInCart = existing
        ? existing.quantity
        : 0;

    if (quantity + quantityInCart > Number(product.quantity)) {

        setMessage(
            "#posMessage",
            `Not enough stock. Available: ${product.quantity}.`
        );

        return;

    }

    if (existing) {

        existing.quantity += quantity;

    } else {

        cart.push({

            productId: product.id,

            name: product.name,

            quantity,

            sellingPrice: Number(product.sellingPrice),

            unitCost: Number(product.buyingPrice)

        });

    }

    $("#posQuantity").value = 1;

    setMessage("#posMessage", "Product added to cart.", true);

    renderCart();

});

function renderCart() {

    const body = $("#cartTableBody");

    if (!cart.length) {

        body.innerHTML = emptyRow(5, "Your cart is empty.");

        $("#cartTotal").textContent = money(0);

        return;

    }

    body.innerHTML = cart.map((item, index) => `

        <tr>

            <td>${safe(item.name)}</td>

            <td>${item.quantity}</td>

            <td>${money(item.sellingPrice)}</td>

            <td>${money(item.quantity * item.sellingPrice)}</td>

            <td>
                <button
                    class="remove-cart-btn"
                    data-remove-cart="${index}">
                    Remove
                </button>
            </td>

        </tr>

    `).join("");

    $("#cartTotal").textContent = money(
        sum(cart, item =>
            item.quantity * item.sellingPrice
        )
    );

}

$("#cartTableBody").addEventListener("click", event => {

    const button = event.target.closest("[data-remove-cart]");

    if (!button) return;

    cart.splice(Number(button.dataset.removeCart), 1);

    renderCart();

});

$("#clearCartBtn").addEventListener("click", () => {

    cart = [];

    renderCart();

    setMessage("#posMessage", "Cart cleared.", true);

});

$("#checkoutBtn").addEventListener("click", () => {

    if (!cart.length) {

        setMessage("#posMessage", "Your cart is empty.");

        return;

    }

    const products = getProducts();

    // Validate all stock before processing the sale.

    for (const item of cart) {

        const product = products.find(
            p => String(p.id) === String(item.productId)
        );

        if (
            !product ||
            product.active === false ||
            Number(product.quantity) < item.quantity
        ) {

            setMessage(
                "#posMessage",
                `Stock changed for ${item.name}. Review your cart.`
            );

            loadPOSOptions();

            return;

        }

    }

    const customerId = $("#posCustomer").value || null;

    const customer = getCustomers().find(
        c => String(c.id) === String(customerId)
    );

    const items = cart.map(item => ({

        productId: item.productId,

        productName: item.name,

        quantity: item.quantity,

        sellingPrice: item.sellingPrice,

        unitCost: item.unitCost,

        revenue: item.quantity * item.sellingPrice,

        cost: item.quantity * item.unitCost,

        grossProfit:
            item.quantity *
            (item.sellingPrice - item.unitCost)

    }));

    const revenue = sum(items, item => item.revenue);

    const cogs = sum(items, item => item.cost);

    const grossProfit = revenue - cogs;

    const sale = {

        id: uid(),

        date: new Date().toISOString(),

        customerId,

        customerName: customer
            ? customer.name
            : "Walk-in",

        paymentMethod: $("#paymentMethod").value,

        items,

        revenue,

        costOfGoodsSold: cogs,

        grossProfit

    };

    // Reduce stock.

    cart.forEach(item => {

        const product = products.find(
            p => String(p.id) === String(item.productId)
        );

        product.quantity =
            Number(product.quantity) - item.quantity;

    });

    // Record stock movements.

    const movements = getMovements();

    items.forEach(item => {

        movements.unshift({

            id: uid(),

            date: sale.date,

            productId: item.productId,

            productName: item.productName,

            type: "Sale",

            quantity: -item.quantity,

            unitCost: item.unitCost,

            note: `Sale ${sale.id}`

        });

    });

    const sales = getSales();

    sales.unshift(sale);

    write(STORAGE.products, products);

    write(STORAGE.sales, sales);

    write(STORAGE.movements, movements);

    cart = [];

    renderCart();

    loadPOSOptions();

    renderSalesHistory();

    renderProducts();

    renderProductSummary();

    renderInventory();

    renderDashboard();

    runReport();

    setMessage(
        "#posMessage",
        `Sale completed! Revenue: ${money(revenue)} | Gross profit: ${money(grossProfit)}`,
        true
    );

});

function renderSalesHistory() {

    const body = $("#salesHistoryBody");

    const sales = getSales().slice(0, 20);

    if (!sales.length) {

        body.innerHTML = emptyRow(8, "No sales recorded yet.");

        return;

    }

    body.innerHTML = sales.map(sale => `

        <tr>

            <td>${safe(String(sale.id).slice(-10))}</td>

            <td>${dateText(sale.date)}</td>

            <td>${safe(sale.customerName || "Walk-in")}</td>

            <td>${safe(sale.paymentMethod || "—")}</td>

            <td>${sum(sale.items || [], item => item.quantity)}</td>

            <td>${money(sale.revenue)}</td>

            <td>${money(sale.costOfGoodsSold)}</td>

            <td>${money(sale.grossProfit)}</td>

        </tr>

    `).join("");

}


// ==========================================
// 5. INVENTORY MANAGEMENT
// ==========================================

function loadRestockOptions() {

    const select = $("#restockProduct");

    const current = select.value;

    select.innerHTML = `
        <option value="">Select product</option>
    `;

    getProducts()
        .filter(product => product.active !== false)
        .forEach(product => {

            const option = document.createElement("option");

            option.value = product.id;

            option.textContent =
                `${product.name} (Stock: ${product.quantity})`;

            select.appendChild(option);

        });

    if ([...select.options].some(option => option.value === current)) {
        select.value = current;
    }

}

$("#restockProduct").addEventListener("change", () => {

    const product = getProducts().find(
        item => String(item.id) === $("#restockProduct").value
    );

    if (product) {

        $("#restockUnitCost").value =
            Number(product.buyingPrice).toFixed(2);

    }

});

$("#restockForm").addEventListener("submit", event => {

    event.preventDefault();

    const id = $("#restockProduct").value;

    const quantity = Number($("#restockQuantity").value);

    const cost = Number($("#restockUnitCost").value);

    const products = getProducts();

    const product = products.find(
        item => String(item.id) === String(id)
    );

    if (
        !product ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        cost <= 0
    ) {

        setMessage(
            "#restockMessage",
            "Enter a product, valid quantity and unit cost."
        );

        return;

    }

    // Weighted-average unit cost.

    const oldQuantity = Number(product.quantity);

    const oldCost = Number(product.buyingPrice);

    const newAverageCost =
        (
            oldQuantity * oldCost +
            quantity * cost
        ) /
        (oldQuantity + quantity);

    product.buyingPrice = newAverageCost;

    product.quantity = oldQuantity + quantity;

    const movements = getMovements();

    movements.unshift({

        id: uid(),

        date: new Date().toISOString(),

        productId: product.id,

        productName: product.name,

        type: "Purchase / Restock",

        quantity,

        unitCost: cost,

        note:
            $("#restockSupplier").value.trim() ||
            "Supplier not specified"

    });

    write(STORAGE.products, products);

    write(STORAGE.movements, movements);

    $("#restockForm").reset();

    setMessage(
        "#restockMessage",
        `${quantity} units added. New average unit cost: ${money(product.buyingPrice)}.`,
        true
    );

    renderInventory();

    renderProducts();

    renderProductSummary();

    renderDashboard();

    loadPOSOptions();

    loadRestockOptions();

});

function renderInventory() {

    const products = getProducts()
        .filter(product => product.active !== false);

    $("#inventoryUnits").textContent =
        sum(products, product => product.quantity);

    $("#inventoryCostTotal").textContent = money(
        sum(products, product =>
            product.quantity * product.buyingPrice
        )
    );

    $("#inventoryLowCount").textContent =
        products.filter(product =>
            Number(product.quantity) <=
            Number(product.minimumStock)
        ).length;

    const body = $("#inventoryTableBody");

    body.innerHTML = products.length
        ? products.map(product => {

            const low =
                Number(product.quantity) <=
                Number(product.minimumStock);

            return `

                <tr>

                    <td>${safe(product.name)}</td>

                    <td>${product.quantity}</td>

                    <td>${money(product.buyingPrice)}</td>

                    <td>${money(product.quantity * product.buyingPrice)}</td>

                    <td>${product.minimumStock}</td>

                    <td class="${low ? "stock-low" : "stock-good"}">
                        ${low ? "Low stock" : "Healthy"}
                    </td>

                </tr>

            `;

        }).join("")
        : emptyRow(6, "No products registered.");

    const movementBody = $("#movementTableBody");

    const movements = getMovements().slice(0, 100);

    movementBody.innerHTML = movements.length
        ? movements.map(movement => `

            <tr>

                <td>${dateText(movement.date)}</td>

                <td>${safe(movement.productName)}</td>

                <td>${safe(movement.type)}</td>

                <td>${movement.quantity > 0 ? "+" : ""}${movement.quantity}</td>

                <td>${money(movement.unitCost)}</td>

                <td>${safe(movement.note || "—")}</td>

            </tr>

        `).join("")
        : emptyRow(6, "No stock movements recorded.");

}


// ==========================================
// 6. CUSTOMER MANAGEMENT
// ==========================================

$("#customerForm").addEventListener("submit", event => {

    event.preventDefault();

    const name = $("#customerName").value.trim();

    if (!name) return;

    const customers = getCustomers();

    customers.push({

        id: uid(),

        name,

        phone: $("#customerPhone").value.trim(),

        email: $("#customerEmail").value.trim(),

        createdAt: new Date().toISOString()

    });

    write(STORAGE.customers, customers);

    $("#customerForm").reset();

    setMessage("#customerMessage", "Customer saved.", true);

    renderCustomers();

    loadPOSOptions();

});

$("#searchCustomer").addEventListener("input", renderCustomers);

function renderCustomers() {

    const body = $("#customerTableBody");

    const query = $("#searchCustomer").value.toLowerCase();

    const customers = getCustomers().filter(customer => {

        return (
            `${customer.name} ${customer.phone} ${customer.email}`
        ).toLowerCase().includes(query);

    });

    body.innerHTML = customers.length
        ? customers.map(customer => {

            const purchases = getSales().filter(
                sale => String(sale.customerId) === String(customer.id)
            );

            return `

                <tr>

                    <td>${safe(customer.name)}</td>

                    <td>${safe(customer.phone || "—")}</td>

                    <td>${safe(customer.email || "—")}</td>

                    <td>${purchases.length}</td>

                    <td>${money(sum(purchases, sale => sale.revenue))}</td>

                    <td>

                        <button
                            class="delete-btn"
                            data-delete-customer="${safe(customer.id)}">
                            Delete
                        </button>

                    </td>

                </tr>

            `;

        }).join("")
        : emptyRow(6, "No customers found.");

}

$("#customerTableBody").addEventListener("click", event => {

    const button = event.target.closest("[data-delete-customer]");

    if (!button) return;

    if (!confirm("Delete this customer record?")) return;

    const customers = getCustomers().filter(
        customer => String(customer.id) !== button.dataset.deleteCustomer
    );

    write(STORAGE.customers, customers);

    renderCustomers();

    loadPOSOptions();

});


// ==========================================
// 7. EMPLOYEE MANAGEMENT
// ==========================================

$("#employeeForm").addEventListener("submit", event => {

    event.preventDefault();

    const employees = getEmployees();

    employees.push({

        id: uid(),

        name: $("#employeeName").value.trim(),

        role: $("#employeeRole").value,

        phone: $("#employeePhone").value.trim(),

        startDate: $("#employeeStartDate").value

    });

    write(STORAGE.employees, employees);

    $("#employeeForm").reset();

    setMessage("#employeeMessage", "Employee saved.", true);

    renderEmployees();

});

function renderEmployees() {

    const body = $("#employeeTableBody");

    const employees = getEmployees();

    body.innerHTML = employees.length
        ? employees.map(employee => `

            <tr>

                <td>${safe(employee.name)}</td>

                <td>${safe(employee.role)}</td>

                <td>${safe(employee.phone || "—")}</td>

                <td>${safe(employee.startDate || "—")}</td>

                <td>

                    <button
                        class="delete-btn"
                        data-delete-employee="${safe(employee.id)}">
                        Delete
                    </button>

                </td>

            </tr>

        `).join("")
        : emptyRow(5, "No employees registered.");

}

$("#employeeTableBody").addEventListener("click", event => {

    const button = event.target.closest("[data-delete-employee]");

    if (!button) return;

    if (!confirm("Delete this employee record?")) return;

    const employees = getEmployees().filter(
        employee => String(employee.id) !== button.dataset.deleteEmployee
    );

    write(STORAGE.employees, employees);

    renderEmployees();

});


// ==========================================
// 8. EXPENSE MANAGEMENT
// ==========================================

$("#expenseDate").value = todayISO();

$("#expenseForm").addEventListener("submit", event => {

    event.preventDefault();

    const amount = Number($("#expenseAmount").value);

    const date = $("#expenseDate").value;

    if (amount <= 0 || !date) {

        setMessage(
            "#expenseMessage",
            "Enter a valid amount and date."
        );

        return;

    }

    const expenses = getExpenses();

    expenses.unshift({

        id: uid(),

        description: $("#expenseDescription").value.trim(),

        category: $("#expenseCategory").value,

        amount,

        date,

        createdAt: new Date().toISOString()

    });

    write(STORAGE.expenses, expenses);

    $("#expenseForm").reset();

    $("#expenseDate").value = todayISO();

    setMessage("#expenseMessage", "Expense saved.", true);

    renderExpenses();

    renderDashboard();

    runReport();

});

function renderExpenses() {

    const expenses = getExpenses();

    const month = todayISO().slice(0, 7);

    const monthlyExpenses = expenses.filter(
        expense => String(expense.date).startsWith(month)
    );

    $("#expenseMonthTotal").textContent = money(
        sum(monthlyExpenses, expense => expense.amount)
    );

    $("#expenseAllTotal").textContent = money(
        sum(expenses, expense => expense.amount)
    );

    $("#expenseRecordCount").textContent = expenses.length;

    const body = $("#expenseTableBody");

    body.innerHTML = expenses.length
        ? expenses.map(expense => `

            <tr>

                <td>${safe(expense.date)}</td>

                <td>${safe(expense.description)}</td>

                <td>${safe(expense.category)}</td>

                <td>${money(expense.amount)}</td>

                <td>

                    <button
                        class="delete-btn"
                        data-delete-expense="${safe(expense.id)}">
                        Delete
                    </button>

                </td>

            </tr>

        `).join("")
        : emptyRow(5, "No expenses recorded.");

}

$("#expenseTableBody").addEventListener("click", event => {

    const button = event.target.closest("[data-delete-expense]");

    if (!button) return;

    if (!confirm("Delete this expense record?")) return;

    const expenses = getExpenses().filter(
        expense => String(expense.id) !== button.dataset.deleteExpense
    );

    write(STORAGE.expenses, expenses);

    renderExpenses();

    renderDashboard();

    runReport();

});


// ==========================================
// 9. DASHBOARD
// ==========================================

let weeklyChart = null;

function renderDashboard() {

    const sales = getSales();

    const products = getProducts()
        .filter(product => product.active !== false);

    const expenses = getExpenses();

    const today = todayISO();

    const month = today.slice(0, 7);

    const todaysSales = sales.filter(
        sale => isSameDay(sale.date, today)
    );

    $("#todaySalesAmount").textContent = money(
        sum(todaysSales, sale => sale.revenue)
    );

    $("#todayProfitAmount").textContent = money(
        sum(todaysSales, sale => sale.grossProfit)
    );

    $("#productsInStock").textContent =
        sum(products, product => product.quantity);

    $("#lowStockItems").textContent =
        products.filter(product =>
            Number(product.quantity) <=
            Number(product.minimumStock)
        ).length;

    const monthlySales = sales.filter(
        sale => String(sale.date).slice(0, 7) === month
    );

    const monthlyExpenses = expenses.filter(
        expense => String(expense.date).startsWith(month)
    );

    const monthlyGrossProfit = sum(
        monthlySales,
        sale => sale.grossProfit
    );

    const monthlyExpenseTotal = sum(
        monthlyExpenses,
        expense => expense.amount
    );

    const netProfit = monthlyGrossProfit - monthlyExpenseTotal;

    $("#monthNetProfit").textContent = money(netProfit);

    $("#monthNetProfit").classList.toggle(
        "negative",
        netProfit < 0
    );

    $("#monthExpenses").textContent =
        money(monthlyExpenseTotal);

    $("#todayDate").textContent =
        new Date().toLocaleDateString(undefined, {
            weekday: "long",
            day: "numeric",
            month: "short",
            year: "numeric"
        });

    // LOW STOCK ALERTS

    const lowStock = products.filter(product =>
        Number(product.quantity) <=
        Number(product.minimumStock)
    );

    const lowStockContainer = $("#dashboardLowStock");

    lowStockContainer.innerHTML = lowStock.length
        ? lowStock.map(product => `

            <div class="list-row">

                <span>${safe(product.name)}</span>

                <strong class="stock-low">
                    ${product.quantity} left
                </strong>

            </div>

        `).join("")
        : "No low-stock products.";

    // RECENT SALES

    const recentContainer = $("#dashboardRecentSales");

    const recentSales = sales.slice(0, 5);

    recentContainer.innerHTML = recentSales.length
        ? recentSales.map(sale => `

            <div class="list-row">

                <span>
                    ${safe(sale.customerName || "Walk-in")}
                    <br>
                    <small>${dateText(sale.date)}</small>
                </span>

                <strong>${money(sale.revenue)}</strong>

            </div>

        `).join("")
        : "No sales recorded yet.";

    renderWeeklyChart();

}


// ==========================================
// 10. WEEKLY SALES CHART
// ==========================================

function renderWeeklyChart() {

    const canvas = $("#weeklySalesChart");

    if (typeof Chart === "undefined") {

        $("#chartFallback").classList.remove("hidden");

        return;

    }

    $("#chartFallback").classList.add("hidden");

    const labels = [];

    const revenue = [];

    const profit = [];

    for (let i = 6; i >= 0; i--) {

        const date = new Date();

        date.setDate(date.getDate() - i);

        const key = date.toISOString().slice(0, 10);

        labels.push(
            date.toLocaleDateString(undefined, {
                weekday: "short"
            })
        );

        const dailySales = getSales().filter(
            sale => isSameDay(sale.date, key)
        );

        revenue.push(
            sum(dailySales, sale => sale.revenue)
        );

        profit.push(
            sum(dailySales, sale => sale.grossProfit)
        );

    }

    if (weeklyChart) {
        weeklyChart.destroy();
    }

    weeklyChart = new Chart(canvas, {

        type: "bar",

        data: {

            labels,

            datasets: [

                {
                    label: "Revenue (KSh)",
                    data: revenue,
                    backgroundColor: "#2563eb"
                },

                {
                    label: "Gross Profit (KSh)",
                    data: profit,
                    backgroundColor: "#16a34a"
                }

            ]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {

                legend: {
                    position: "bottom"
                }

            },

            scales: {

                y: {
                    beginAtZero: true
                }

            }

        }

    });

}


// ==========================================
// 11. BUSINESS REPORTS
// ==========================================

function selectedReportData() {

    const start = $("#reportStart").value;

    const end = $("#reportEnd").value;

    const sales = getSales().filter(
        sale => isBetween(sale.date, start, end)
    );

    const expenses = getExpenses().filter(
        expense => isBetween(expense.date, start, end)
    );

    const revenue = sum(sales, sale => sale.revenue);

    const cogs = sum(
        sales,
        sale => sale.costOfGoodsSold
    );

    const gross = revenue - cogs;

    const expense = sum(
        expenses,
        item => item.amount
    );

    const net = gross - expense;

    const margin = revenue > 0
        ? net / revenue * 100
        : 0;

    return {
        sales,
        expenses,
        revenue,
        cogs,
        gross,
        expense,
        net,
        margin
    };

}

function runReport() {

    const data = selectedReportData();

    $("#reportRevenue").textContent =
        money(data.revenue);

    $("#reportCOGS").textContent =
        money(data.cogs);

    $("#reportGrossProfit").textContent =
        money(data.gross);

    $("#reportExpenses").textContent =
        money(data.expense);

    $("#reportNetProfit").textContent =
        money(data.net);

    $("#reportNetProfit").classList.toggle(
        "negative",
        data.net < 0
    );

    $("#reportNetProfit").classList.toggle(
        "positive",
        data.net > 0
    );

    $("#reportNetMargin").textContent =
        `${data.margin.toFixed(2)}%`;

    $("#reportExplanation").textContent =

        `Revenue of ${money(data.revenue)} less cost of goods sold ` +
        `${money(data.cogs)} gives gross profit of ${money(data.gross)}. ` +
        `After operating expenses of ${money(data.expense)}, ` +
        `the recorded net result is ${money(data.net)}. ` +
        `Net margin is net profit or loss divided by sales revenue. ` +
        `This report only includes information recorded in ShopWeb.`;

    const body = $("#reportSalesBody");

    body.innerHTML = data.sales.length
        ? data.sales.map(sale => `

            <tr>

                <td>${safe(String(sale.id).slice(-10))}</td>

                <td>${dateText(sale.date)}</td>

                <td>${safe(sale.customerName || "Walk-in")}</td>

                <td>${money(sale.revenue)}</td>

                <td>${money(sale.costOfGoodsSold)}</td>

                <td>${money(sale.grossProfit)}</td>

            </tr>

        `).join("")
        : emptyRow(6, "No sales in this date range.");

}

$("#runReportBtn").addEventListener("click", runReport);

$("#allTimeReportBtn").addEventListener("click", () => {

    $("#reportStart").value = "";

    $("#reportEnd").value = "";

    runReport();

});


// ==========================================
// 12. EXPORT REPORT TO CSV
// ==========================================

function downloadCSV(filename, rows) {

    const csv = rows.map(row =>

        row.map(value =>

            `"${String(value ?? "").replace(/"/g, '""')}"`

        ).join(",")

    ).join("\r\n");

    const blob = new Blob(
        [csv],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = filename;

    link.click();

    URL.revokeObjectURL(url);

}

$("#exportReportBtn").addEventListener("click", () => {

    const data = selectedReportData();

    const rows = [

        [
            "Sale ID",
            "Date",
            "Customer",
            "Revenue",
            "COGS",
            "Gross Profit"
        ],

        ...data.sales.map(sale => [

            sale.id,

            sale.date,

            sale.customerName || "Walk-in",

            sale.revenue,

            sale.costOfGoodsSold,

            sale.grossProfit

        ]),

        [],

        ["Financial Summary", "Amount"],

        ["Revenue", data.revenue],

        ["Cost of Goods Sold", data.cogs],

        ["Gross Profit", data.gross],

        ["Operating Expenses", data.expense],

        ["Net Profit / Loss", data.net],

        ["Net Profit Margin (%)", data.margin.toFixed(2)]

    ];

    downloadCSV("shopweb-report.csv", rows);

});


// ==========================================
// 13. SETTINGS
// ==========================================

function loadSettingsForm() {

    const settings = getSettings();

    $("#shopName").value = settings.shopName || "";

    $("#shopPhone").value = settings.shopPhone || "";

    $("#shopLocation").value = settings.shopLocation || "";

    $("#currency").value = settings.currency || "KSh";

}

$("#settingsForm").addEventListener("submit", event => {

    event.preventDefault();

    const settings = {

        shopName: $("#shopName").value.trim(),

        shopPhone: $("#shopPhone").value.trim(),

        shopLocation: $("#shopLocation").value.trim(),

        currency: $("#currency").value

    };

    write(STORAGE.settings, settings);

    $("#headerShopName").textContent =
        settings.shopName || "My Shop";

    setMessage(
        "#settingsMessage",
        "Settings saved successfully.",
        true
    );

    renderDashboard();

    renderProducts();

    renderInventory();

    renderSalesHistory();

});


// ==========================================
// 14. DATA BACKUP
// ==========================================

$("#backupDataBtn").addEventListener("click", () => {

    const backup = {

        exportedAt: new Date().toISOString(),

        products: getProducts(),

        sales: getSales(),

        movements: getMovements(),

        customers: getCustomers(),

        employees: getEmployees(),

        expenses: getExpenses(),

        settings: getSettings()

    };

    const blob = new Blob(

        [JSON.stringify(backup, null, 2)],

        { type: "application/json" }

    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = "shopweb-backup.json";

    link.click();

    URL.revokeObjectURL(url);

});


// ==========================================
// 15. INITIALIZE SHOPWEB
// ==========================================

function initialize() {

    $("#headerShopName").textContent =
        getSettings().shopName || "My Shop";

    $("#expenseDate").value = todayISO();

    renderProducts();

    renderProductSummary();

    loadPOSOptions();

    renderCart();

    renderSalesHistory();

    loadRestockOptions();

    renderInventory();

    renderCustomers();

    renderEmployees();

    renderExpenses();

    renderDashboard();

    loadSettingsForm();

    runReport();

    // Restore the last selected page from URL.

    const hash = location.hash.slice(1);

    if (hash && document.getElementById(hash)) {

        const link = document.querySelector(
            `#sideBar nav a[href="#${hash}"]`
        );

        if (link) {
            link.click();
        }

    }

}

initialize();