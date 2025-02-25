const express = require('express');
const fs = require("fs");
const app = express();
const port = 3000;

const headers = ["id", "description", "Field1", "Field2", "Field3", "Field4", "Field5", "Field6", "brand", "code", "price"];

function convertCSVToObject() {
  const csvData = fs.readFileSync('./LE.csv', 'utf-8');
  const lines = csvData.trim().split('\n'); // Split the data by newlines
  const result = [];

  lines.forEach(line => {
    const values = line.split('\t').map(value => value.replace(/"/g, '')); // Split by tabs and remove quotes
    const obj = {};

    headers.forEach((header, index) => {
      if (!header.includes('Field')) {
        obj[header] = values[index] || null; // Map each header to its respective value, default to null if missing
      }
    });

    result.push(obj);
  });

  return result;
}

const cache = convertCSVToObject();

app.get('/', (req, res) => {
  res.status(200).send('Use REST');
});

app.get('/spare-parts', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const sort = req.query.sort || ''; // Get the sort parameter
  const limit = 40;

  // Extract query parameters for search
  const name = req.query.name || '';  // Default to an empty string if no name is provided
  const serialNumber = req.query.sn || '';  // Default to an empty string if no serial number is provided

  if (cache) {
    // Filter the data based on the `name` and/or `serialNumber` if provided
    let filteredData = cache;

    // Filter by name (description)
    if (name) {
      filteredData = filteredData.filter(item => {
        if (item.description != null) {
          return item.description.toLowerCase().includes(name.toLowerCase());
        }
      });
    }

    // Filter by serial number (id)
    if (serialNumber) {
      filteredData = filteredData.filter(item => 
        item.id.includes(serialNumber) // Match partial serial number
      );
    }

    // Sorting by column
    if (sort) {
      const isDescending = sort.startsWith('-');
      const columnName = isDescending ? sort.slice(1) : sort; // Remove the '-' if descending
    
      // Sort by the selected column
      filteredData.sort((a, b) => {
        let valueA = a[columnName];
        let valueB = b[columnName];
    
        // Handle price as a number and remove commas for proper sorting
        if (columnName === 'price') {
          // Clean the value and parse it as a float for comparison
          valueA = parseFloat(valueA.replace(',', '.').replace(/[^\d.-]/g, ''));
          valueB = parseFloat(valueB.replace(',', '.').replace(/[^\d.-]/g, ''));
        } else {
          // For other fields, ensure they are strings
          valueA = valueA != null ? valueA.toString() : '';
          valueB = valueB != null ? valueB.toString() : '';
        }
    
        // Handle cases where values might be null or undefined
        if (valueA == null && valueB == null) return 0;
        if (valueA == null) return isDescending ? 1 : -1;
        if (valueB == null) return isDescending ? -1 : 1;
    
        // Now compare the values (numerically for price, or lexicographically for strings)
        if (isDescending) {
          return valueB - valueA; // For numerical values like price
        } else {
          return valueA < valueB ? -1 : valueA > valueB ? 1 : 0; // For string comparisons
        }
      });
    }
    

    // Pagination logic
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const paginatedData = filteredData.slice(startIndex, endIndex);

    const response = {
      page: page,
      limit: limit,
      total: filteredData.length,
      totalPages: Math.ceil(filteredData.length / limit),
      data: paginatedData,
    };

    res.status(200).json(response);
  } else {
    res.status(404).send('Not found');
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
