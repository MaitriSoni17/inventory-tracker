// Utility functions for salary report export
// eslint-disable-next-line no-unused-vars
import html2pdf from 'html2pdf.js';
// eslint-disable-next-line no-unused-vars
import * as XLSX from 'xlsx';

export const generateSalaryReportPDF = async (salaryData, paidSalaries, formatCurrency) => {
    try {
        let htmlContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8f9fa;">
                <div style="text-align: center; margin-bottom: 30px; background-color: #7b2cbf; padding: 20px; border-radius: 8px;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">Salary Management Report</h1>
                    <p style="color: #e0e0e0; margin: 5px 0 0 0;">Generated on ${new Date().toLocaleDateString('en-IN')}</p>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px; background-color: white;">
                    <thead>
                        <tr style="background-color: #7b2cbf; color: white;">
                            <th style="padding: 12px; text-align: left; border: 1px solid #7b2cbf; color: white; background-color: #7b2cbf; font-weight: bold;">Employee Name</th>
                            <th style="padding: 12px; text-align: left; border: 1px solid #7b2cbf; color: white; background-color: #7b2cbf; font-weight: bold;">Email</th>
                            <th style="padding: 12px; text-align: left; border: 1px solid #7b2cbf; color: white; background-color: #7b2cbf; font-weight: bold;">Role</th>
                            <th style="padding: 12px; text-align: left; border: 1px solid #7b2cbf; color: white; background-color: #7b2cbf; font-weight: bold;">Warehouse</th>
                            <th style="padding: 12px; text-align: right; border: 1px solid #7b2cbf; color: white; background-color: #7b2cbf; font-weight: bold;">Base Salary</th>
                            <th style="padding: 12px; text-align: right; border: 1px solid #7b2cbf; color: white; background-color: #7b2cbf; font-weight: bold;">Paid Salary</th>
                            <th style="padding: 12px; text-align: left; border: 1px solid #7b2cbf; color: white; background-color: #7b2cbf; font-weight: bold;">Frequency</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${salaryData.map(emp => `
                            <tr style="border-bottom: 1px solid #dee2e6;">
                                <td style="padding: 10px; border: 1px solid #dee2e6;">${emp.fullName}</td>
                                <td style="padding: 10px; border: 1px solid #dee2e6;">${emp.email}</td>
                                <td style="padding: 10px; border: 1px solid #dee2e6; text-transform: capitalize;">${emp.role}</td>
                                <td style="padding: 10px; border: 1px solid #dee2e6;">${emp.warehouse}</td>
                                <td style="padding: 10px; border: 1px solid #dee2e6; text-align: right;">₹${emp.baseSalary.toLocaleString('en-IN')}</td>
                                <td style="padding: 10px; border: 1px solid #dee2e6; text-align: right; color: #17a2b8; font-weight: bold;">₹${(paidSalaries[emp._id] || 0).toLocaleString('en-IN')}</td>
                                <td style="padding: 10px; border: 1px solid #dee2e6; text-transform: capitalize;">${emp.paymentFrequency}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div style="margin-top: 30px; padding: 15px; background-color: #f0e6ff; border-radius: 8px;">
                    <h3 style="margin: 0 0 10px 0; color: #af50ff;">Summary</h3>
                    <p style="margin: 5px 0;">Total Employees: <strong>${salaryData.length}</strong></p>
                    <p style="margin: 5px 0;">Employees with Salary: <strong>${salaryData.filter(e => e.baseSalary > 0).length}</strong></p>
                    <p style="margin: 5px 0;">Total Base Payroll: <strong>₹${salaryData.reduce((sum, e) => sum + e.baseSalary, 0).toLocaleString('en-IN')}</strong></p>
                    <p style="margin: 5px 0;">Total Paid: <strong>₹${Object.values(paidSalaries).reduce((sum, val) => sum + (val || 0), 0).toLocaleString('en-IN')}</strong></p>
                </div>
            </div>
        `;

        const opt = {
            margin: 10,
            filename: `Salary_Report_${new Date().getTime()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
        };

        html2pdf().set(opt).from(htmlContent).save();
        return true;
    } catch (error) {
        // console.error('Error generating PDF:', error);
        return false;
    }
};

export const generateSalaryReportExcel = (salaryData, paidSalaries) => {
    try {
        const data = salaryData.map(emp => ({
            'Employee Name': emp.fullName,
            'Email': emp.email,
            'Role': emp.role,
            'Warehouse': emp.warehouse,
            'Base Salary': emp.baseSalary,
            'Paid Salary': paidSalaries[emp._id] || 0,
            'Currency': emp.currency,
            'Payment Frequency': emp.paymentFrequency,
            'Last Updated': emp.lastUpdated ? new Date(emp.lastUpdated).toLocaleDateString('en-IN') : 'N/A'
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        
        // Set column widths
        const wscols = [
            { wch: 20 },
            { wch: 25 },
            { wch: 12 },
            { wch: 20 },
            { wch: 15 },
            { wch: 15 },
            { wch: 12 },
            { wch: 18 },
            { wch: 15 }
        ];
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, 'Salary Report');
        XLSX.writeFile(wb, `Salary_Report_${new Date().getTime()}.xlsx`);
        
        return true;
    } catch (error) {
        // console.error('Error generating Excel:', error);
        return false;
    }
};

export const generateIndividualSalaryReportPDF = async (employee, payments, paidTotal, formatCurrency) => {
    try {
        let htmlContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8f9fa;">
                <div style="text-align: center; margin-bottom: 30px; background-color: #7b2cbf; padding: 20px; border-radius: 8px;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">Individual Salary Report</h1>
                    <p style="color: #e0e0e0; margin: 5px 0 0 0;">Generated on ${new Date().toLocaleDateString('en-IN')}</p>
                </div>
                
                <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #af50ff;">
                    <h2 style="margin: 0 0 15px 0; color: #333;">${employee.fullName}</h2>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <p style="margin: 5px 0; color: #666;"><strong>Email:</strong> ${employee.email}</p>
                            <p style="margin: 5px 0; color: #666;"><strong>Role:</strong> ${employee.role}</p>
                            <p style="margin: 5px 0; color: #666;"><strong>Warehouse:</strong> ${employee.warehouse}</p>
                        </div>
                        <div>
                            <p style="margin: 5px 0; color: #666;"><strong>Base Salary:</strong> ₹${employee.baseSalary.toLocaleString('en-IN')} ${employee.paymentFrequency}</p>
                            <p style="margin: 5px 0; color: #17a2b8; font-weight: bold;"><strong>Total Paid:</strong> ₹${paidTotal.toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                </div>

                ${payments && payments.length > 0 ? `
                    <h3 style="color: #af50ff; margin-top: 30px;">Payment History</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 10px; background-color: white;">
                        <thead>
                            <tr style="background-color: #af50ff; color: white;">
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Payment Date</th>
                                <th style="padding: 12px; text-align: right; border: 1px solid #dee2e6;">Amount</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Method</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Period</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${payments.map(payment => `
                                <tr style="border-bottom: 1px solid #dee2e6;">
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${new Date(payment.paymentDate).toLocaleDateString('en-IN')}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6; text-align: right;">₹${payment.amount.toLocaleString('en-IN')}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6; text-transform: capitalize;">${payment.paymentMethod.replace('_', ' ')}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${payment.paymentPeriod || 'N/A'}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${payment.description || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<p style="margin-top: 20px; color: #666;">No payment history available.</p>'}
            </div>
        `;

        const opt = {
            margin: 10,
            filename: `${employee.fullName}_Salary_Report_${new Date().getTime()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
        };

        html2pdf().set(opt).from(htmlContent).save();
        return true;
    } catch (error) {
        // console.error('Error generating individual PDF:', error);
        return false;
    }
};
