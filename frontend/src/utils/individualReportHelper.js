// Individual Report Export Helpers
import html2pdf from 'html2pdf.js';
import * as XLSX from 'xlsx';

// Generate Individual Employee Report
export const generateIndividualEmployeeReportPDF = async (employee, formatDate, formatPhoneNumber) => {
    try {
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8f9fa;">
                <div style="text-align: center; margin-bottom: 30px; background-color: #7b2cbf; padding: 20px; border-radius: 8px;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">Employee Report</h1>
                    <p style="color: #e0e0e0; margin: 5px 0 0 0;">Generated on ${new Date().toLocaleDateString('en-IN')}</p>
                </div>
                
                <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #7b2cbf;">
                    <h2 style="margin: 0 0 15px 0; color: #333;">${employee.fname} ${employee.lname || ''}</h2>
                    <table style="width: 100%; margin-top: 10px;">
                        <tr>
                            <td style="padding: 8px; color: #666;"><strong>Email:</strong> ${employee.email}</td>
                            <td style="padding: 8px; color: #666;"><strong>Phone:</strong> ${formatPhoneNumber ? formatPhoneNumber(employee.phone) : employee.phone || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; color: #666;"><strong>Role:</strong> ${employee.role}</td>
                            <td style="padding: 8px; color: #666;"><strong>Gender:</strong> ${employee.gender || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; color: #666;"><strong>Joining Date:</strong> ${formatDate(employee.jDate)}</td>
                            <td style="padding: 8px; color: #666;"><strong>Birth Date:</strong> ${formatDate(employee.birthDate)}</td>
                        </tr>
                        <tr>
                            <td colspan="2" style="padding: 8px; color: #666;"><strong>Address:</strong> ${employee.address || 'N/A'}</td>
                        </tr>
                    </table>
                </div>
            </div>
        `;

        const opt = {
            margin: 10,
            filename: `${employee.fname}_${employee.lname}_Report_${new Date().getTime()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
        };

        html2pdf().set(opt).from(htmlContent).save();
        return true;
    } catch (error) {
        console.error('Error generating employee report:', error);
        return false;
    }
};

// Generate Individual Product Report
export const generateIndividualProductReportPDF = async (product, categoryMap, warehouseMap) => {
    try {
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8f9fa;">
                <div style="text-align: center; margin-bottom: 30px; background-color: #7b2cbf; padding: 20px; border-radius: 8px;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">Product Report</h1>
                    <p style="color: #e0e0e0; margin: 5px 0 0 0;">Generated on ${new Date().toLocaleDateString('en-IN')}</p>
                </div>
                
                <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #7b2cbf;">
                    <h2 style="margin: 0 0 15px 0; color: #333;">${product.name || product.pName}</h2>
                    <table style="width: 100%; margin-top: 10px;">
                        <tr>
                            <td style="padding: 8px; color: #666;"><strong>Product ID:</strong> ${product._id.slice(-6)}</td>
                            <td style="padding: 8px; color: #666;"><strong>Category:</strong> ${categoryMap ? categoryMap[product.category] || product.category : product.category}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; color: #666;"><strong>Price:</strong> ₹${product.price?.toLocaleString('en-IN')}</td>
                            <td style="padding: 8px; color: #666;"><strong>Stock Quantity:</strong> ${product.totalProducts || product.quantity || 0}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; color: #666;"><strong>Warehouse:</strong> ${Array.isArray(product.warehouse) ? product.warehouse.map(w => warehouseMap ? warehouseMap[w] || w : w).join(', ') : (warehouseMap ? warehouseMap[product.warehouse] || product.warehouse : product.warehouse)}</td>
                            <td style="padding: 8px; color: #666;"><strong>Status:</strong> Active</td>
                        </tr>
                        <tr>
                            <td colspan="2" style="padding: 8px; color: #666;"><strong>Description:</strong> ${product.pDesc || product.description || 'N/A'}</td>
                        </tr>
                    </table>
                </div>
            </div>
        `;

        const opt = {
            margin: 10,
            filename: `${product.name || product.pName}_Report_${new Date().getTime()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
        };

        html2pdf().set(opt).from(htmlContent).save();
        return true;
    } catch (error) {
        console.error('Error generating product report:', error);
        return false;
    }
};

// Generate Individual Order Report
export const generateIndividualOrderReportPDF = async (order, categoryMap, warehouseMap) => {
    try {
        // Get warehouse name from object or use warehouseMap
        const getWarehouseName = () => {
            if (order.warehouse) {
                if (typeof order.warehouse === 'object' && order.warehouse._id) {
                    return warehouseMap ? warehouseMap[order.warehouse._id] || order.warehouse._id : order.warehouse._id;
                }
                return warehouseMap ? warehouseMap[order.warehouse] || order.warehouse : order.warehouse;
            }
            return '-';
        };

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8f9fa;">
                <div style="text-align: center; margin-bottom: 30px; background-color: #7b2cbf; padding: 20px; border-radius: 8px;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">Order Report</h1>
                    <p style="color: #e0e0e0; margin: 5px 0 0 0;">Generated on ${new Date().toLocaleDateString('en-IN')}</p>
                </div>
                
                <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #7b2cbf;">
                    <h2 style="margin: 0 0 15px 0; color: #333;">Order #${order._id?.slice(-6)}</h2>
                    <table style="width: 100%; margin-top: 10px;">
                        <tr>
                            <td style="padding: 8px; color: #666;"><strong>Customer:</strong> ${order.cName || 'N/A'}</td>
                            <td style="padding: 8px; color: #666;"><strong>Product:</strong> ${order.pName || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; color: #666;"><strong>Amount:</strong> ₹${order.amount?.toLocaleString('en-IN') || '0'}</td>
                            <td style="padding: 8px; color: #666;"><strong>Status:</strong> ${order.status || 'Pending'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; color: #666;"><strong>Delivery Status:</strong> ${order.dStatus || 'Not Shipped'}</td>
                            <td style="padding: 8px; color: #666;"><strong>Warehouse:</strong> ${getWarehouseName()}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; color: #666;"><strong>Order Date:</strong> ${order.oDate ? new Date(order.oDate).toLocaleDateString('en-IN') : 'N/A'}</td>
                            <td style="padding: 8px; color: #666;"><strong>Delivery Date:</strong> ${order.dDate ? new Date(order.dDate).toLocaleDateString('en-IN') : 'N/A'}</td>
                        </tr>
                        <tr>
                            <td colspan="2" style="padding: 8px; color: #666;"><strong>Product Availability:</strong> ${order.pAvail || 'N/A'}</td>
                        </tr>
                    </table>
                </div>
            </div>
        `;

        const opt = {
            margin: 10,
            filename: `Order_${order._id?.slice(-6)}_Report_${new Date().getTime()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
        };

        html2pdf().set(opt).from(htmlContent).save();
        return true;
    } catch (error) {
        console.error('Error generating order report:', error);
        return false;
    }
};

// Generate Individual Supplier Order Report
export const generateIndividualSupplierOrderReportPDF = async (order, supplierName) => {
    try {
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8f9fa;">
                <div style="text-align: center; margin-bottom: 30px; background-color: #7b2cbf; padding: 20px; border-radius: 8px;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">Supplier Order Report</h1>
                    <p style="color: #e0e0e0; margin: 5px 0 0 0;">Generated on ${new Date().toLocaleDateString('en-IN')}</p>
                </div>
                
                <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #7b2cbf;">
                    <h2 style="margin: 0 0 15px 0; color: #333;">Order #${order._id?.slice(-6)}</h2>
                    <table style="width: 100%; margin-top: 10px;">
                        <tr>
                            <td style="padding: 8px; color: #666;"><strong>Supplier:</strong> ${supplierName}</td>
                            <td style="padding: 8px; color: #666;"><strong>Product:</strong> ${order.pName || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; color: #666;"><strong>Units:</strong> ${order.ounits || '0'}</td>
                            <td style="padding: 8px; color: #666;"><strong>Amount:</strong> ₹${order.amount?.toLocaleString('en-IN') || '0'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; color: #666;\"><strong>Order Date:</strong> ${order.oDate ? new Date(order.oDate).toLocaleDateString('en-IN') : 'N/A'}</td>
                            <td style="padding: 8px; color: #666;\"><strong>Delivery Date:</strong> ${order.dDate ? new Date(order.dDate).toLocaleDateString('en-IN') : 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; color: #666;\"><strong>Status:</strong> ${order.status || 'Pending'}</td>
                            <td style="padding: 8px; color: #666;\"><strong>Delivery Status:</strong> ${order.dStatus || 'Not Received'}</td>
                        </tr>
                        <tr>
                            <td colspan="2" style="padding: 8px; color: #666;\"><strong>Availability:</strong> ${order.pAvail || 'N/A'}</td>
                        </tr>
                    </table>
                </div>
            </div>
        `;

        const opt = {
            margin: 10,
            filename: `Supplier_Order_${order._id?.slice(-6)}_Report_${new Date().getTime()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
        };

        html2pdf().set(opt).from(htmlContent).save();
        return true;
    } catch (error) {
        console.error('Error generating supplier order report:', error);
        return false;
    }
};

// Generate Individual Supplier Report
export const generateIndividualSupplierReportPDF = async (supplier) => {
    try {
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8f9fa;">
                <div style="text-align: center; margin-bottom: 30px; background-color: #7b2cbf; padding: 20px; border-radius: 8px;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">Supplier Report</h1>
                    <p style="color: #e0e0e0; margin: 5px 0 0 0;">Generated on ${new Date().toLocaleDateString('en-IN')}</p>
                </div>
                
                <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #7b2cbf;">
                    <h2 style="margin: 0 0 15px 0; color: #333;">${supplier.fname || ''} ${supplier.lname || ''}</h2>
                    <table style="width: 100%; margin-top: 10px;">
                        <tr>
                            <td style="padding: 8px; color: #666;"><strong>Supplier ID:</strong> ${supplier._id.slice(-6)}</td>
                            <td style="padding: 8px; color: #666;"><strong>Status:</strong> Active</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; color: #666;"><strong>Email:</strong> ${supplier.email || 'N/A'}</td>
                            <td style="padding: 8px; color: #666;"><strong>Phone:</strong> ${supplier.phone || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; color: #666;"><strong>City:</strong> ${supplier.city || 'N/A'}</td>
                            <td style="padding: 8px; color: #666;"><strong>Country:</strong> ${supplier.country || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; color: #666;"><strong>State:</strong> ${supplier.state || 'N/A'}</td>
                            <td style="padding: 8px; color: #666;"><strong>Postal Code:</strong> ${supplier.postalCode || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td colspan="2" style="padding: 8px; color: #666;"><strong>Address:</strong> ${supplier.address || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td colspan="2" style="padding: 8px; color: #666;"><strong>Company Name:</strong> ${supplier.companyName || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td colspan="2" style="padding: 8px; color: #666;"><strong>Description:</strong> ${supplier.about || 'N/A'}</td>
                        </tr>
                    </table>
                </div>
            </div>
        `;

        const opt = {
            margin: 10,
            filename: `${supplier.fname}_${supplier.lname}_Supplier_Report_${new Date().getTime()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
        };

        html2pdf().set(opt).from(htmlContent).save();
        return true;
    } catch (error) {
        console.error('Error generating supplier report:', error);
        return false;
    }
};
