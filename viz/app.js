// D3 App for three visuals in one page
// - Scatter: total donated vs received (log-log)
// - Map: net balance (received - donated), diverging centered at 0
// - Small multiples: top 5 purposes by total received

(async function main() {
  // Data paths
  const totalsPath = '../data/processed/country_totals.json';
  const purposesPath = '../data/processed/purposes_top5.json';

  // World geometry (CDN; requires internet). Fallback to local if provided.
  const worldJsonUrls = [
    // Primary CDN
    'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',
    // Alternate CDN
    'https://unpkg.com/world-atlas@2/countries-110m.json',
    // Optional local fallback (place under viz/world/)
    'world/countries-110m.json'
  ];

  // Fetch processed data first to enable scatter even if maps fail
  let totals, purposes, countryPurposesReceived, countryPurposesDonated, topDonorsByRecipientPurpose, chordFlows, temporalData;
  try {
    [totals, purposes, countryPurposesReceived, countryPurposesDonated, topDonorsByRecipientPurpose, chordFlows, temporalData] = await Promise.all([
      d3.json(totalsPath),
      d3.json(purposesPath),
      d3.json('../data/processed/country_purposes_received.json'),
      d3.json('../data/processed/country_purposes_donated.json'),
      d3.json('../data/processed/top_donors_by_recipient_purpose.json'),
      d3.json('../data/processed/chord_flows.json'),
      d3.json('../data/processed/temporal_purposes.json')
    ]);
  } catch (e) {
    showError('#scatter-section', 'Failed to load processed JSON. Ensure you ran the aggregation and are serving over HTTP.');
    return;
  }

  // Index of totals by iso2
  const byIso2 = new Map((totals.countries || []).map(d => [d.iso2.toUpperCase(), d]));

  // Comprehensive ISO2 to country name mapping
  const iso2ToName = new Map([
    ['AF', 'Afghanistan'], ['AX', 'Åland Islands'], ['AL', 'Albania'], ['DZ', 'Algeria'],
    ['AS', 'American Samoa'], ['AD', 'Andorra'], ['AO', 'Angola'], ['AI', 'Anguilla'],
    ['AQ', 'Antarctica'], ['AG', 'Antigua and Barbuda'], ['AR', 'Argentina'], ['AM', 'Armenia'],
    ['AW', 'Aruba'], ['AU', 'Australia'], ['AT', 'Austria'], ['AZ', 'Azerbaijan'],
    ['BS', 'Bahamas'], ['BH', 'Bahrain'], ['BD', 'Bangladesh'], ['BB', 'Barbados'],
    ['BY', 'Belarus'], ['BE', 'Belgium'], ['BZ', 'Belize'], ['BJ', 'Benin'],
    ['BM', 'Bermuda'], ['BT', 'Bhutan'], ['BO', 'Bolivia'], ['BA', 'Bosnia and Herzegovina'],
    ['BW', 'Botswana'], ['BV', 'Bouvet Island'], ['BR', 'Brazil'], ['IO', 'British Indian Ocean Territory'],
    ['BN', 'Brunei'], ['BG', 'Bulgaria'], ['BF', 'Burkina Faso'], ['BI', 'Burundi'],
    ['KH', 'Cambodia'], ['CM', 'Cameroon'], ['CA', 'Canada'], ['CV', 'Cape Verde'],
    ['KY', 'Cayman Islands'], ['CF', 'Central African Republic'], ['TD', 'Chad'], ['CL', 'Chile'],
    ['CN', 'China'], ['CX', 'Christmas Island'], ['CC', 'Cocos Islands'], ['CO', 'Colombia'],
    ['KM', 'Comoros'], ['CG', 'Congo'], ['CD', 'Congo (DRC)'], ['CK', 'Cook Islands'],
    ['CR', 'Costa Rica'], ['CI', 'Côte d\'Ivoire'], ['HR', 'Croatia'], ['CU', 'Cuba'],
    ['CY', 'Cyprus'], ['CZ', 'Czech Republic'], ['DK', 'Denmark'], ['DJ', 'Djibouti'],
    ['DM', 'Dominica'], ['DO', 'Dominican Republic'], ['EC', 'Ecuador'], ['EG', 'Egypt'],
    ['SV', 'El Salvador'], ['GQ', 'Equatorial Guinea'], ['ER', 'Eritrea'], ['EE', 'Estonia'],
    ['ET', 'Ethiopia'], ['FK', 'Falkland Islands'], ['FO', 'Faroe Islands'], ['FJ', 'Fiji'],
    ['FI', 'Finland'], ['FR', 'France'], ['GF', 'French Guiana'], ['PF', 'French Polynesia'],
    ['TF', 'French Southern Territories'], ['GA', 'Gabon'], ['GM', 'Gambia'], ['GE', 'Georgia'],
    ['DE', 'Germany'], ['GH', 'Ghana'], ['GI', 'Gibraltar'], ['GR', 'Greece'],
    ['GL', 'Greenland'], ['GD', 'Grenada'], ['GP', 'Guadeloupe'], ['GU', 'Guam'],
    ['GT', 'Guatemala'], ['GG', 'Guernsey'], ['GN', 'Guinea'], ['GW', 'Guinea-Bissau'],
    ['GY', 'Guyana'], ['HT', 'Haiti'], ['HM', 'Heard Island'], ['VA', 'Vatican City'],
    ['HN', 'Honduras'], ['HK', 'Hong Kong'], ['HU', 'Hungary'], ['IS', 'Iceland'],
    ['IN', 'India'], ['ID', 'Indonesia'], ['IR', 'Iran'], ['IQ', 'Iraq'],
    ['IE', 'Ireland'], ['IM', 'Isle of Man'], ['IL', 'Israel'], ['IT', 'Italy'],
    ['JM', 'Jamaica'], ['JP', 'Japan'], ['JE', 'Jersey'], ['JO', 'Jordan'],
    ['KZ', 'Kazakhstan'], ['KE', 'Kenya'], ['KI', 'Kiribati'], ['KP', 'North Korea'],
    ['KR', 'South Korea'], ['KW', 'Kuwait'], ['KG', 'Kyrgyzstan'], ['LA', 'Laos'],
    ['LV', 'Latvia'], ['LB', 'Lebanon'], ['LS', 'Lesotho'], ['LR', 'Liberia'],
    ['LY', 'Libya'], ['LI', 'Liechtenstein'], ['LT', 'Lithuania'], ['LU', 'Luxembourg'],
    ['MO', 'Macao'], ['MK', 'North Macedonia'], ['MG', 'Madagascar'], ['MW', 'Malawi'],
    ['MY', 'Malaysia'], ['MV', 'Maldives'], ['ML', 'Mali'], ['MT', 'Malta'],
    ['MH', 'Marshall Islands'], ['MQ', 'Martinique'], ['MR', 'Mauritania'], ['MU', 'Mauritius'],
    ['YT', 'Mayotte'], ['MX', 'Mexico'], ['FM', 'Micronesia'], ['MD', 'Moldova'],
    ['MC', 'Monaco'], ['MN', 'Mongolia'], ['ME', 'Montenegro'], ['MS', 'Montserrat'],
    ['MA', 'Morocco'], ['MZ', 'Mozambique'], ['MM', 'Myanmar'], ['NA', 'Namibia'],
    ['NR', 'Nauru'], ['NP', 'Nepal'], ['NL', 'Netherlands'], ['AN', 'Netherlands Antilles'],
    ['NC', 'New Caledonia'], ['NZ', 'New Zealand'], ['NI', 'Nicaragua'], ['NE', 'Niger'],
    ['NG', 'Nigeria'], ['NU', 'Niue'], ['NF', 'Norfolk Island'], ['MP', 'Northern Mariana Islands'],
    ['NO', 'Norway'], ['OM', 'Oman'], ['PK', 'Pakistan'], ['PW', 'Palau'],
    ['PS', 'Palestine'], ['PA', 'Panama'], ['PG', 'Papua New Guinea'], ['PY', 'Paraguay'],
    ['PE', 'Peru'], ['PH', 'Philippines'], ['PN', 'Pitcairn'], ['PL', 'Poland'],
    ['PT', 'Portugal'], ['PR', 'Puerto Rico'], ['QA', 'Qatar'], ['RE', 'Réunion'],
    ['RO', 'Romania'], ['RU', 'Russia'], ['RW', 'Rwanda'], ['BL', 'Saint Barthélemy'],
    ['SH', 'Saint Helena'], ['KN', 'Saint Kitts and Nevis'], ['LC', 'Saint Lucia'],
    ['MF', 'Saint Martin'], ['PM', 'Saint Pierre and Miquelon'], ['VC', 'Saint Vincent and the Grenadines'],
    ['WS', 'Samoa'], ['SM', 'San Marino'], ['ST', 'São Tomé and Príncipe'], ['SA', 'Saudi Arabia'],
    ['SN', 'Senegal'], ['RS', 'Serbia'], ['SC', 'Seychelles'], ['SL', 'Sierra Leone'],
    ['SG', 'Singapore'], ['SK', 'Slovakia'], ['SI', 'Slovenia'], ['SB', 'Solomon Islands'],
    ['SO', 'Somalia'], ['ZA', 'South Africa'], ['GS', 'South Georgia'], ['SS', 'South Sudan'],
    ['ES', 'Spain'], ['LK', 'Sri Lanka'], ['SD', 'Sudan'], ['SR', 'Suriname'],
    ['SJ', 'Svalbard and Jan Mayen'], ['SZ', 'Swaziland'], ['SE', 'Sweden'], ['CH', 'Switzerland'],
    ['SY', 'Syria'], ['TW', 'Taiwan'], ['TJ', 'Tajikistan'], ['TZ', 'Tanzania'],
    ['TH', 'Thailand'], ['TL', 'Timor-Leste'], ['TG', 'Togo'], ['TK', 'Tokelau'],
    ['TO', 'Tonga'], ['TT', 'Trinidad and Tobago'], ['TN', 'Tunisia'], ['TR', 'Turkey'],
    ['TM', 'Turkmenistan'], ['TC', 'Turks and Caicos Islands'], ['TV', 'Tuvalu'], ['UG', 'Uganda'],
    ['UA', 'Ukraine'], ['AE', 'United Arab Emirates'], ['GB', 'United Kingdom'], ['US', 'United States'],
    ['UM', 'US Minor Outlying Islands'], ['UY', 'Uruguay'], ['UZ', 'Uzbekistan'], ['VU', 'Vanuatu'],
    ['VE', 'Venezuela'], ['VN', 'Vietnam'], ['VG', 'British Virgin Islands'], ['VI', 'US Virgin Islands'],
    ['WF', 'Wallis and Futuna'], ['EH', 'Western Sahara'], ['YE', 'Yemen'], ['ZM', 'Zambia'],
    ['ZW', 'Zimbabwe'], ['CS', 'Serbia and Montenegro'], ['YU', 'Yugoslavia'], ['SU', 'Soviet Union'],
    ['CE', 'Ceuta'], ['XK', 'Kosovo']
  ]);

  let earlyNameByIso2 = iso2ToName;

  // 1) Scatterplot: Donate vs Receive (log-log) — always attempt
  drawScatter(byIso2, earlyNameByIso2, countryPurposesReceived, countryPurposesDonated);

  // Try to load world geometry; if it fails, keep scatter and warn user for maps
  let countries = null;
  try {
    const world = await firstOk(worldJsonUrls.map(url => () => d3.json(url)));
    countries = topojson.feature(world, world.objects.countries);
  } catch (e) {
    showError('#netmap-section', 'World map data unavailable. Check internet or add files to viz/world/.');
    showError('#purposes-section', 'World map data unavailable. Check internet or add files to viz/world/.');
    return; // Scatter already rendered
  }

  // Mapping from ISO numeric codes (feature IDs) to ISO2 codes
  const numericToIso2 = new Map([
    ['004', 'AF'], ['008', 'AL'], ['010', 'AQ'], ['012', 'DZ'], ['016', 'AS'],
    ['020', 'AD'], ['024', 'AO'], ['028', 'AG'], ['031', 'AZ'], ['032', 'AR'],
    ['036', 'AU'], ['040', 'AT'], ['044', 'BS'], ['048', 'BH'], ['050', 'BD'],
    ['051', 'AM'], ['052', 'BB'], ['056', 'BE'], ['060', 'BM'], ['064', 'BT'],
    ['068', 'BO'], ['070', 'BA'], ['072', 'BW'], ['074', 'BV'], ['076', 'BR'],
    ['084', 'BZ'], ['086', 'IO'], ['090', 'SB'], ['092', 'VG'], ['096', 'BN'],
    ['100', 'BG'], ['104', 'MM'], ['108', 'BI'], ['112', 'BY'], ['116', 'KH'],
    ['120', 'CM'], ['124', 'CA'], ['132', 'CV'], ['136', 'KY'], ['140', 'CF'],
    ['144', 'LK'], ['148', 'TD'], ['152', 'CL'], ['156', 'CN'], ['158', 'TW'],
    ['162', 'CX'], ['166', 'CC'], ['170', 'CO'], ['174', 'KM'], ['175', 'YT'],
    ['178', 'CG'], ['180', 'CD'], ['184', 'CK'], ['188', 'CR'], ['191', 'HR'],
    ['192', 'CU'], ['196', 'CY'], ['203', 'CZ'], ['204', 'BJ'], ['208', 'DK'],
    ['212', 'DM'], ['214', 'DO'], ['218', 'EC'], ['222', 'SV'], ['226', 'GQ'],
    ['231', 'ET'], ['232', 'ER'], ['233', 'EE'], ['234', 'FO'], ['238', 'FK'],
    ['239', 'GS'], ['242', 'FJ'], ['246', 'FI'], ['248', 'AX'], ['250', 'FR'],
    ['254', 'GF'], ['258', 'PF'], ['260', 'TF'], ['262', 'DJ'], ['266', 'GA'],
    ['268', 'GE'], ['270', 'GM'], ['275', 'PS'], ['276', 'DE'], ['288', 'GH'],
    ['292', 'GI'], ['296', 'KI'], ['300', 'GR'], ['304', 'GL'], ['308', 'GD'],
    ['312', 'GP'], ['316', 'GU'], ['320', 'GT'], ['324', 'GN'], ['328', 'GY'],
    ['332', 'HT'], ['334', 'HM'], ['336', 'VA'], ['340', 'HN'], ['344', 'HK'],
    ['348', 'HU'], ['352', 'IS'], ['356', 'IN'], ['360', 'ID'], ['364', 'IR'],
    ['368', 'IQ'], ['372', 'IE'], ['376', 'IL'], ['380', 'IT'], ['384', 'CI'],
    ['388', 'JM'], ['392', 'JP'], ['398', 'KZ'], ['400', 'JO'], ['404', 'KE'],
    ['408', 'KP'], ['410', 'KR'], ['414', 'KW'], ['417', 'KG'], ['418', 'LA'],
    ['422', 'LB'], ['426', 'LS'], ['428', 'LV'], ['430', 'LR'], ['434', 'LY'],
    ['438', 'LI'], ['440', 'LT'], ['442', 'LU'], ['446', 'MO'], ['450', 'MG'],
    ['454', 'MW'], ['458', 'MY'], ['462', 'MV'], ['466', 'ML'], ['470', 'MT'],
    ['474', 'MQ'], ['478', 'MR'], ['480', 'MU'], ['484', 'MX'], ['492', 'MC'],
    ['496', 'MN'], ['498', 'MD'], ['499', 'ME'], ['500', 'MS'], ['504', 'MA'],
    ['508', 'MZ'], ['512', 'OM'], ['516', 'NA'], ['520', 'NR'], ['524', 'NP'],
    ['528', 'NL'], ['531', 'CW'], ['533', 'AW'], ['534', 'SX'], ['535', 'BQ'],
    ['540', 'NC'], ['548', 'VU'], ['554', 'NZ'], ['558', 'NI'], ['562', 'NE'],
    ['566', 'NG'], ['570', 'NU'], ['574', 'NF'], ['578', 'NO'], ['580', 'MP'],
    ['581', 'UM'], ['583', 'FM'], ['584', 'MH'], ['585', 'PW'], ['586', 'PK'],
    ['591', 'PA'], ['598', 'PG'], ['600', 'PY'], ['604', 'PE'], ['608', 'PH'],
    ['612', 'PN'], ['616', 'PL'], ['620', 'PT'], ['624', 'GW'], ['626', 'TL'],
    ['630', 'PR'], ['634', 'QA'], ['638', 'RE'], ['642', 'RO'], ['643', 'RU'],
    ['646', 'RW'], ['652', 'BL'], ['654', 'SH'], ['659', 'KN'], ['660', 'AI'],
    ['662', 'LC'], ['663', 'MF'], ['666', 'PM'], ['670', 'VC'], ['674', 'SM'],
    ['678', 'ST'], ['682', 'SA'], ['686', 'SN'], ['688', 'RS'], ['690', 'SC'],
    ['694', 'SL'], ['702', 'SG'], ['703', 'SK'], ['704', 'VN'], ['705', 'SI'],
    ['706', 'SO'], ['710', 'ZA'], ['716', 'ZW'], ['724', 'ES'], ['728', 'SS'],
    ['729', 'SD'], ['732', 'EH'], ['740', 'SR'], ['744', 'SJ'], ['748', 'SZ'],
    ['752', 'SE'], ['756', 'CH'], ['760', 'SY'], ['762', 'TJ'], ['764', 'TH'],
    ['768', 'TG'], ['772', 'TK'], ['776', 'TO'], ['780', 'TT'], ['784', 'AE'],
    ['788', 'TN'], ['792', 'TR'], ['795', 'TM'], ['796', 'TC'], ['798', 'TV'],
    ['800', 'UG'], ['804', 'UA'], ['807', 'MK'], ['818', 'EG'], ['826', 'GB'],
    ['831', 'GG'], ['832', 'JE'], ['833', 'IM'], ['834', 'TZ'], ['840', 'US'],
    ['850', 'VI'], ['854', 'BF'], ['858', 'UY'], ['860', 'UZ'], ['862', 'VE'],
    ['876', 'WF'], ['882', 'WS'], ['887', 'YE'], ['894', 'ZM']
  ]);

  // Build ISO2 -> feature ID mapping and name by ID mapping
  const idByIso2 = new Map();
  const nameByIso2 = iso2ToName;
  const nameById = new Map();

  countries.features.forEach(f => {
    const numericId = String(f.id).padStart(3, '0');
    const iso2 = numericToIso2.get(numericId);

    if (f.properties?.name) {
      nameById.set(String(f.id), f.properties.name);
    }

    if (iso2) {
      idByIso2.set(iso2, String(f.id));
    }
  });

  // 2) Net Balance Map (diverging)
  drawNetMap(countries, byIso2, idByIso2, nameById);

  // 3) Small Multiples: Top 5 purposes
  drawPurposeMaps(countries, purposes, idByIso2, nameById, topDonorsByRecipientPurpose);

  // 4) Chord Diagram: Aid flow network
  drawChordDiagram(chordFlows);

  // 5) Temporal Chart: Aid priorities over time
  drawTemporalChart(temporalData);
})();

async function firstOk(tasks) {
  let lastErr;
  for (const task of tasks) {
    try { return await task(); } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

function showError(sectionSel, message) {
  d3.select(sectionSel)
    .append('div')
    .style('marginTop', '8px')
    .style('color', '#ff9c9c')
    .style('fontSize', '0.95rem')
    .text(message);
}

function drawScatter(byIso2, nameByIso2, countryPurposesReceived, countryPurposesDonated) {
  const el = d3.select('#scatter');
  el.selectAll('*').remove();

  // Country dropdown for selection
  const controlsDiv = el.append('div')
    .style('margin-bottom', '10px')
    .style('display', 'flex')
    .style('align-items', 'center')
    .style('gap', '10px');

  controlsDiv.append('label')
    .attr('for', 'country-select')
    .style('font-size', '13px')
    .style('color', '#666')
    .text('Select country:');

  // Build sorted country list with names
  const countryOptions = Array.from(byIso2.entries())
    .filter(([iso2, d]) => d.donated > 0 && d.received > 0)
    .map(([iso2, d]) => ({
      iso2: iso2,
      name: nameByIso2.get(iso2.toUpperCase()) || iso2,
      donated: d.donated,
      received: d.received
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const dropdown = controlsDiv.append('select')
    .attr('id', 'country-select')
    .style('padding', '6px 10px')
    .style('border', '1px solid #d1d5db')
    .style('border-radius', '6px')
    .style('font-size', '13px')
    .style('min-width', '200px')
    .style('cursor', 'pointer');

  dropdown.append('option')
    .attr('value', '')
    .text('-- Choose a country --');

  dropdown.selectAll('option.country')
    .data(countryOptions)
    .join('option')
    .attr('class', 'country')
    .attr('value', d => d.iso2)
    .text(d => d.name);

  const margin = { top: 20, right: 18, bottom: 40, left: 52 };
  const width = el.node().getBoundingClientRect().width || 500;
  const height = Math.min(340, width * 0.6);

  const svg = el.append('svg').attr('width', width).attr('height', height);
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const data = Array.from(byIso2.values())
    .filter(d => d.donated > 0 && d.received > 0);

  const x = d3.scaleLog()
    .domain(d3.extent(data, d => d.donated))
    .nice()
    .range([0, innerW]);
  const y = d3.scaleLog()
    .domain(d3.extent(data, d => d.received))
    .nice()
    .range([innerH, 0]);

  const ax = d3.axisBottom(x).ticks(6).tickFormat(d => fmtAxisMoney(d));
  const ay = d3.axisLeft(y).ticks(6).tickFormat(d => fmtAxisMoney(d));

  g.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerH})`).call(ax);
  g.append('g').attr('class', 'axis').call(ay);

  // Axis labels
  svg.append('text')
    .attr('class', 'axis-label')
    .attr('x', margin.left + innerW / 2)
    .attr('y', height - 6)
    .attr('text-anchor', 'middle')
    .text('Total Donated (USD)');

  svg.append('text')
    .attr('class', 'axis-label')
    .attr('transform', `translate(12, ${margin.top + innerH / 2}) rotate(-90)`)
    .attr('text-anchor', 'middle')
    .text('Total Received (USD)');

  // y = x reference line: where donated equals received
  // Find the range where line y=x intersects the visible plot area
  const xDomain = x.domain();
  const yDomain = y.domain();
  const lineMin = Math.max(xDomain[0], yDomain[0]);
  const lineMax = Math.min(xDomain[1], yDomain[1]);

  // Only draw if there's a valid intersection
  if (lineMin < lineMax) {
    // Calculate pixel coordinates for the y=x line
    const x1 = x(lineMin), y1 = y(lineMin);
    const x2 = x(lineMax), y2 = y(lineMax);

    // Shaded regions above and below y = x line
    // Area above the line (received > donated) - blue shade
    g.append('path')
      .attr('d', `M 0,0 L ${innerW},0 L ${innerW},${y2} L ${x2},${y2} L ${x1},${y1} L 0,${y1} Z`)
      .attr('fill', '#dbeafe')
      .attr('opacity', 0.4);

    // Area below the line (donated > received) - red shade
    g.append('path')
      .attr('d', `M 0,${innerH} L ${innerW},${innerH} L ${innerW},${y2} L ${x2},${y2} L ${x1},${y1} L 0,${y1} Z`)
      .attr('fill', '#fee2e2')
      .attr('opacity', 0.4);

    // y = x reference line
    g.append('line')
      .attr('x1', x1).attr('y1', y1)
      .attr('x2', x2).attr('y2', y2)
      .attr('stroke', '#495070')
      .attr('stroke-dasharray', '4,4')
      .attr('fill', 'none');
  }

  const tt = d3.select('#tooltip');

  // Create a panel for purpose breakdown
  const breakdownPanel = el.append('div')
    .attr('class', 'purpose-breakdown-panel')
    .style('display', 'none');

  function showPurposeBreakdown(d) {
    const name = nameByIso2.get(d.iso2.toUpperCase()) || d.iso2;
    const purposesReceived = countryPurposesReceived[d.iso2.toUpperCase()] || {};
    const purposesDonated = countryPurposesDonated[d.iso2.toUpperCase()] || {};

    breakdownPanel.selectAll('*').remove();
    breakdownPanel.style('display', 'block');

    // Header
    const header = breakdownPanel.append('div').attr('class', 'breakdown-header');
    header.append('h3').text(`${name} - Purpose Breakdown`);
    header.append('button')
      .attr('class', 'close-btn')
      .text('×')
      .on('click', () => {
        breakdownPanel.style('display', 'none');
        g.selectAll('.dot').attr('stroke', 'none').attr('stroke-width', 0);
      });

    // Helper function to draw a bar chart
    function drawBarChart(container, purposeData, title, totalAmount, color) {
      const purposeList = Object.entries(purposeData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10); // Show top 10

      container.append('h4')
        .style('margin', '16px 0 8px 0')
        .style('color', color)
        .text(title);

      if (purposeList.length === 0) {
        container.append('p')
          .style('color', '#888')
          .style('font-style', 'italic')
          .text('No data available.');
        return;
      }

      container.append('p')
        .attr('class', 'breakdown-summary')
        .html(`Total: <strong>${fmtMoney(totalAmount)}</strong> across ${Object.keys(purposeData).length} purposes (showing top 10)`);

      const barHeight = 24;
      const barMargin = { top: 10, right: 80, bottom: 10, left: 250 };
      const barWidth = 300;
      const chartHeight = purposeList.length * barHeight + barMargin.top + barMargin.bottom;

      const barSvg = container.append('svg')
        .attr('width', barWidth + barMargin.left + barMargin.right)
        .attr('height', chartHeight);

      const barG = barSvg.append('g')
        .attr('transform', `translate(${barMargin.left},${barMargin.top})`);

      const xScale = d3.scaleLinear()
        .domain([0, d3.max(purposeList, p => p[1])])
        .range([0, barWidth]);

      purposeList.forEach(([purpose, value], i) => {
        const row = barG.append('g')
          .attr('transform', `translate(0,${i * barHeight})`);

        // Purpose label
        row.append('text')
          .attr('x', -8)
          .attr('y', barHeight / 2)
          .attr('text-anchor', 'end')
          .attr('dominant-baseline', 'middle')
          .attr('class', 'purpose-label')
          .style('font-size', '11px')
          .text(purpose.length > 35 ? purpose.substring(0, 35) + '...' : purpose);

        // Bar
        row.append('rect')
          .attr('x', 0)
          .attr('y', 3)
          .attr('width', xScale(value))
          .attr('height', barHeight - 6)
          .attr('fill', color)
          .attr('opacity', 0.7);

        // Value label
        row.append('text')
          .attr('x', xScale(value) + 6)
          .attr('y', barHeight / 2)
          .attr('dominant-baseline', 'middle')
          .attr('class', 'value-label')
          .style('font-size', '11px')
          .text(fmtAxisMoney(value));
      });
    }

    // Container for both charts side by side
    const chartsContainer = breakdownPanel.append('div')
      .style('display', 'flex')
      .style('gap', '40px')
      .style('flex-wrap', 'wrap');

    // Received chart (blue)
    const receivedContainer = chartsContainer.append('div');
    drawBarChart(receivedContainer, purposesReceived, 'Aid Received by Purpose', d.received, '#2563eb');

    // Donated chart (red)
    const donatedContainer = chartsContainer.append('div');
    drawBarChart(donatedContainer, purposesDonated, 'Aid Donated by Purpose', d.donated, '#dc2626');
  }

  g.selectAll('.dot')
    .data(data)
    .join('circle')
    .attr('class', 'dot')
    .attr('r', 5)
    .attr('cx', d => x(d.donated))
    .attr('cy', d => y(d.received))
    .on('mouseenter', function() {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('r', 8)
        .attr('fill', '#f97316');
    })
    .on('mousemove', (event, d) => {
      const name = nameByIso2.get(d.iso2.toUpperCase()) || d.iso2;
      tt.style('opacity', 1)
        .html(`<strong>${name}</strong><br/>Donated: ${fmtMoney(d.donated)}<br/>Received: ${fmtMoney(d.received)}<br/><em>Click for purpose breakdown</em>`)
        .style('left', `${event.clientX + 10}px`)
        .style('top', `${event.clientY + 10}px`);
    })
    .on('mouseleave', function(event, d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('r', 5)
        .attr('fill', '#2563eb');
      tt.style('opacity', 0);
    })
    .on('click', function(event, d) {
      event.stopPropagation();
      g.selectAll('.dot').attr('stroke', 'none').attr('stroke-width', 0);
      d3.select(this).attr('stroke', '#f97316').attr('stroke-width', 3);
      showPurposeBreakdown(d);
      tt.style('opacity', 0);
      // Update dropdown to match
      dropdown.property('value', d.iso2);
    });

  // Dropdown change event handler
  dropdown.on('change', function() {
    const selectedIso2 = this.value;

    if (!selectedIso2) {
      // Reset: remove all highlights and hide breakdown
      g.selectAll('.dot')
        .attr('stroke', 'none')
        .attr('stroke-width', 0)
        .attr('r', 5)
        .attr('fill', '#2563eb');
      breakdownPanel.style('display', 'none');
      return;
    }

    // Find the data for the selected country
    const selectedData = data.find(d => d.iso2 === selectedIso2);
    if (!selectedData) return;

    // Reset all dots first
    g.selectAll('.dot')
      .attr('stroke', 'none')
      .attr('stroke-width', 0)
      .attr('r', 5)
      .attr('fill', '#2563eb');

    // Highlight the selected dot
    g.selectAll('.dot')
      .filter(d => d.iso2 === selectedIso2)
      .attr('stroke', '#f97316')
      .attr('stroke-width', 3)
      .attr('r', 8)
      .attr('fill', '#f97316');

    // Show the purpose breakdown
    showPurposeBreakdown(selectedData);
  });
}

function drawNetMap(countries, byIso2, idByIso2, nameById) {
  const el = d3.select('#netmap');
  el.selectAll('*').remove();
  const width = el.node().getBoundingClientRect().width || 500;
  const height = Math.min(360, width * 0.55);

  // Country neighbor adjacency data (ISO2 -> array of neighbor ISO2 codes)
  const neighbors = {
    'AF': ['CN', 'IR', 'PK', 'TJ', 'TM', 'UZ'],
    'AL': ['GR', 'ME', 'MK', 'RS', 'XK'],
    'DZ': ['LY', 'MA', 'MR', 'ML', 'NE', 'TN', 'EH'],
    'AD': ['ES', 'FR'],
    'AO': ['CD', 'CG', 'NA', 'ZM'],
    'AR': ['BO', 'BR', 'CL', 'PY', 'UY'],
    'AM': ['AZ', 'GE', 'IR', 'TR'],
    'AT': ['CH', 'CZ', 'DE', 'HU', 'IT', 'LI', 'SI', 'SK'],
    'AZ': ['AM', 'GE', 'IR', 'RU', 'TR'],
    'BD': ['IN', 'MM'],
    'BY': ['LT', 'LV', 'PL', 'RU', 'UA'],
    'BE': ['DE', 'FR', 'LU', 'NL'],
    'BZ': ['GT', 'MX'],
    'BJ': ['BF', 'NE', 'NG', 'TG'],
    'BT': ['CN', 'IN'],
    'BO': ['AR', 'BR', 'CL', 'PY', 'PE'],
    'BA': ['HR', 'ME', 'RS'],
    'BW': ['NA', 'ZA', 'ZM', 'ZW'],
    'BR': ['AR', 'BO', 'CO', 'GY', 'PY', 'PE', 'SR', 'UY', 'VE', 'GF'],
    'BN': ['MY'],
    'BG': ['GR', 'MK', 'RO', 'RS', 'TR'],
    'BF': ['BJ', 'CI', 'GH', 'ML', 'NE', 'TG'],
    'BI': ['CD', 'RW', 'TZ'],
    'KH': ['LA', 'TH', 'VN'],
    'CM': ['CF', 'TD', 'CG', 'GQ', 'GA', 'NG'],
    'CA': ['US'],
    'CF': ['CM', 'TD', 'CD', 'CG', 'SS', 'SD'],
    'TD': ['CM', 'CF', 'LY', 'NE', 'NG', 'SD'],
    'CL': ['AR', 'BO', 'PE'],
    'CN': ['AF', 'BT', 'IN', 'KZ', 'KP', 'KG', 'LA', 'MN', 'MM', 'NP', 'PK', 'RU', 'TJ', 'VN'],
    'CO': ['BR', 'EC', 'PA', 'PE', 'VE'],
    'CG': ['AO', 'CM', 'CF', 'CD', 'GA'],
    'CD': ['AO', 'BI', 'CF', 'CG', 'RW', 'SS', 'TZ', 'UG', 'ZM'],
    'CR': ['NI', 'PA'],
    'CI': ['BF', 'GH', 'GN', 'LR', 'ML'],
    'HR': ['BA', 'HU', 'ME', 'RS', 'SI'],
    'CZ': ['AT', 'DE', 'PL', 'SK'],
    'DK': ['DE'],
    'DJ': ['ER', 'ET', 'SO'],
    'DO': ['HT'],
    'EC': ['CO', 'PE'],
    'EG': ['IL', 'LY', 'PS', 'SD'],
    'SV': ['GT', 'HN'],
    'GQ': ['CM', 'GA'],
    'ER': ['DJ', 'ET', 'SD'],
    'EE': ['LV', 'RU'],
    'SZ': ['MZ', 'ZA'],
    'ET': ['DJ', 'ER', 'KE', 'SO', 'SS', 'SD'],
    'FI': ['NO', 'RU', 'SE'],
    'FR': ['AD', 'BE', 'DE', 'IT', 'LU', 'MC', 'ES', 'CH'],
    'GA': ['CM', 'CG', 'GQ'],
    'GM': ['SN'],
    'GE': ['AM', 'AZ', 'RU', 'TR'],
    'DE': ['AT', 'BE', 'CZ', 'DK', 'FR', 'LU', 'NL', 'PL', 'CH'],
    'GH': ['BF', 'CI', 'TG'],
    'GR': ['AL', 'BG', 'MK', 'TR'],
    'GT': ['BZ', 'SV', 'HN', 'MX'],
    'GN': ['CI', 'GW', 'LR', 'ML', 'SN', 'SL'],
    'GW': ['GN', 'SN'],
    'GY': ['BR', 'SR', 'VE'],
    'HT': ['DO'],
    'HN': ['GT', 'NI', 'SV'],
    'HU': ['AT', 'HR', 'RO', 'RS', 'SK', 'SI', 'UA'],
    'IN': ['BD', 'BT', 'CN', 'MM', 'NP', 'PK'],
    'ID': ['MY', 'PG', 'TL'],
    'IR': ['AF', 'AM', 'AZ', 'IQ', 'PK', 'TR', 'TM'],
    'IQ': ['IR', 'JO', 'KW', 'SA', 'SY', 'TR'],
    'IE': ['GB'],
    'IL': ['EG', 'JO', 'LB', 'PS', 'SY'],
    'IT': ['AT', 'FR', 'SM', 'SI', 'CH', 'VA'],
    'JO': ['IQ', 'IL', 'PS', 'SA', 'SY'],
    'KZ': ['CN', 'KG', 'RU', 'TM', 'UZ'],
    'KE': ['ET', 'SO', 'SS', 'TZ', 'UG'],
    'KP': ['CN', 'KR', 'RU'],
    'KR': ['KP'],
    'KW': ['IQ', 'SA'],
    'KG': ['CN', 'KZ', 'TJ', 'UZ'],
    'LA': ['CN', 'KH', 'MM', 'TH', 'VN'],
    'LV': ['BY', 'EE', 'LT', 'RU'],
    'LB': ['IL', 'SY'],
    'LS': ['ZA'],
    'LR': ['CI', 'GN', 'SL'],
    'LY': ['DZ', 'TD', 'EG', 'NE', 'SD', 'TN'],
    'LI': ['AT', 'CH'],
    'LT': ['BY', 'LV', 'PL', 'RU'],
    'LU': ['BE', 'FR', 'DE'],
    'MK': ['AL', 'BG', 'GR', 'RS', 'XK'],
    'MW': ['MZ', 'TZ', 'ZM'],
    'MY': ['BN', 'ID', 'TH'],
    'ML': ['DZ', 'BF', 'CI', 'GN', 'MR', 'NE', 'SN'],
    'MR': ['DZ', 'ML', 'SN', 'EH'],
    'MX': ['BZ', 'GT', 'US'],
    'MD': ['RO', 'UA'],
    'MC': ['FR'],
    'MN': ['CN', 'RU'],
    'ME': ['AL', 'BA', 'HR', 'RS', 'XK'],
    'MA': ['DZ', 'EH', 'ES'],
    'MZ': ['MW', 'ZA', 'SZ', 'TZ', 'ZM', 'ZW'],
    'MM': ['BD', 'CN', 'IN', 'LA', 'TH'],
    'NA': ['AO', 'BW', 'ZA', 'ZM'],
    'NP': ['CN', 'IN'],
    'NL': ['BE', 'DE'],
    'NI': ['CR', 'HN'],
    'NE': ['DZ', 'BJ', 'BF', 'TD', 'LY', 'ML', 'NG'],
    'NG': ['BJ', 'CM', 'TD', 'NE'],
    'NO': ['FI', 'RU', 'SE'],
    'OM': ['SA', 'AE', 'YE'],
    'PK': ['AF', 'CN', 'IN', 'IR'],
    'PS': ['EG', 'IL', 'JO'],
    'PA': ['CO', 'CR'],
    'PG': ['ID'],
    'PY': ['AR', 'BO', 'BR'],
    'PE': ['BO', 'BR', 'CL', 'CO', 'EC'],
    'PL': ['BY', 'CZ', 'DE', 'LT', 'RU', 'SK', 'UA'],
    'PT': ['ES'],
    'QA': ['SA'],
    'RO': ['BG', 'HU', 'MD', 'RS', 'UA'],
    'RU': ['AZ', 'BY', 'CN', 'EE', 'FI', 'GE', 'KZ', 'KP', 'LV', 'LT', 'MN', 'NO', 'PL', 'UA'],
    'RW': ['BI', 'CD', 'TZ', 'UG'],
    'SA': ['IQ', 'JO', 'KW', 'OM', 'QA', 'AE', 'YE'],
    'SN': ['GM', 'GN', 'GW', 'ML', 'MR'],
    'RS': ['AL', 'BA', 'BG', 'HR', 'HU', 'MK', 'ME', 'RO', 'XK'],
    'SL': ['GN', 'LR'],
    'SK': ['AT', 'CZ', 'HU', 'PL', 'UA'],
    'SI': ['AT', 'HR', 'HU', 'IT'],
    'SO': ['DJ', 'ET', 'KE'],
    'ZA': ['BW', 'LS', 'MZ', 'NA', 'SZ', 'ZW'],
    'SS': ['CF', 'CD', 'ET', 'KE', 'SD', 'UG'],
    'ES': ['AD', 'FR', 'MA', 'PT'],
    'SD': ['CF', 'TD', 'EG', 'ER', 'ET', 'LY', 'SS'],
    'SR': ['BR', 'GY', 'GF'],
    'SE': ['FI', 'NO'],
    'CH': ['AT', 'FR', 'DE', 'IT', 'LI'],
    'SY': ['IQ', 'IL', 'JO', 'LB', 'TR'],
    'TJ': ['AF', 'CN', 'KG', 'UZ'],
    'TZ': ['BI', 'CD', 'KE', 'MW', 'MZ', 'RW', 'UG', 'ZM'],
    'TH': ['KH', 'LA', 'MY', 'MM'],
    'TL': ['ID'],
    'TG': ['BJ', 'BF', 'GH'],
    'TN': ['DZ', 'LY'],
    'TR': ['AM', 'AZ', 'BG', 'GE', 'GR', 'IR', 'IQ', 'SY'],
    'TM': ['AF', 'IR', 'KZ', 'UZ'],
    'UG': ['CD', 'KE', 'RW', 'SS', 'TZ'],
    'UA': ['BY', 'HU', 'MD', 'PL', 'RO', 'RU', 'SK'],
    'AE': ['OM', 'SA'],
    'GB': ['IE'],
    'US': ['CA', 'MX'],
    'UY': ['AR', 'BR'],
    'UZ': ['AF', 'KZ', 'KG', 'TJ', 'TM'],
    'VE': ['BR', 'CO', 'GY'],
    'VN': ['CN', 'KH', 'LA'],
    'EH': ['DZ', 'MA', 'MR'],
    'YE': ['OM', 'SA'],
    'ZM': ['AO', 'BW', 'CD', 'MW', 'MZ', 'NA', 'TZ', 'ZW'],
    'ZW': ['BW', 'MZ', 'ZA', 'ZM'],
    'XK': ['AL', 'MK', 'ME', 'RS'],
    'GF': ['BR', 'SR']
  };

  // Regional groupings for summary statistics
  const regions = {
    'Western Europe': ['AT', 'BE', 'CH', 'DE', 'FR', 'LI', 'LU', 'MC', 'NL'],
    'Northern Europe': ['DK', 'EE', 'FI', 'GB', 'IE', 'IS', 'LT', 'LV', 'NO', 'SE'],
    'Southern Europe': ['AD', 'AL', 'BA', 'ES', 'GR', 'HR', 'IT', 'ME', 'MK', 'MT', 'PT', 'RS', 'SI', 'SM', 'VA', 'XK'],
    'Eastern Europe': ['BY', 'BG', 'CZ', 'HU', 'MD', 'PL', 'RO', 'RU', 'SK', 'UA'],
    'North America': ['CA', 'US', 'MX'],
    'Central America': ['BZ', 'CR', 'GT', 'HN', 'NI', 'PA', 'SV'],
    'Caribbean': ['CU', 'DO', 'HT', 'JM', 'PR', 'TT', 'BS', 'BB', 'AG', 'DM', 'GD', 'KN', 'LC', 'VC'],
    'South America': ['AR', 'BO', 'BR', 'CL', 'CO', 'EC', 'GY', 'PE', 'PY', 'SR', 'UY', 'VE', 'GF'],
    'North Africa': ['DZ', 'EG', 'LY', 'MA', 'SD', 'TN', 'EH'],
    'West Africa': ['BF', 'BJ', 'CI', 'CV', 'GH', 'GM', 'GN', 'GW', 'LR', 'ML', 'MR', 'NE', 'NG', 'SL', 'SN', 'TG'],
    'Central Africa': ['AO', 'CD', 'CF', 'CG', 'CM', 'GA', 'GQ', 'ST', 'TD'],
    'East Africa': ['BI', 'DJ', 'ER', 'ET', 'KE', 'MG', 'MU', 'MW', 'MZ', 'RW', 'SC', 'SO', 'SS', 'TZ', 'UG', 'ZM', 'ZW', 'KM'],
    'Southern Africa': ['BW', 'LS', 'NA', 'SZ', 'ZA'],
    'Middle East': ['AE', 'BH', 'IL', 'IQ', 'IR', 'JO', 'KW', 'LB', 'OM', 'PS', 'QA', 'SA', 'SY', 'TR', 'YE'],
    'Central Asia': ['AF', 'KG', 'KZ', 'TJ', 'TM', 'UZ'],
    'South Asia': ['BD', 'BT', 'IN', 'LK', 'MV', 'NP', 'PK'],
    'Southeast Asia': ['BN', 'ID', 'KH', 'LA', 'MM', 'MY', 'PH', 'SG', 'TH', 'TL', 'VN'],
    'East Asia': ['CN', 'JP', 'KP', 'KR', 'MN', 'TW'],
    'Oceania': ['AU', 'FJ', 'NZ', 'PG', 'SB', 'VU', 'WS', 'TO', 'PW', 'FM', 'MH', 'KI', 'NR', 'TV']
  };

  // Add info text
  el.append('div')
    .style('margin-bottom', '8px')
    .style('font-size', '12px')
    .style('color', '#666')
    .text('Hover over a country to see details and highlight neighbors.');

  const svg = el.append('svg').attr('width', width).attr('height', height);

  // Add hatching pattern for no-data countries
  const defs = svg.append('defs');
  const pattern = defs.append('pattern')
    .attr('id', 'nodata-hatch')
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('width', 6)
    .attr('height', 6);
  pattern.append('rect')
    .attr('width', 6)
    .attr('height', 6)
    .attr('fill', '#d1d5db');
  pattern.append('path')
    .attr('d', 'M0,6 L6,0')
    .attr('stroke', '#9ca3af')
    .attr('stroke-width', 1);

  const projection = d3.geoNaturalEarth1().fitSize([width, height], countries);
  const path = d3.geoPath(projection);

  // Symmetric log scale for better distribution of colors
  const symlogScale = (value) => {
    const sign = value < 0 ? -1 : 1;
    const absVal = Math.abs(value);
    return sign * Math.log1p(absVal / 1e9);
  };

  const minVal = -500e9;
  const maxVal = 100e9;
  const symlogMin = symlogScale(minVal);
  const symlogMax = symlogScale(maxVal);

  // Custom interpolator for net balance
  const customInterpolator = (t) => {
    if (t < 0.5) {
      const tRed = (0.5 - t) * 2;
      return d3.interpolateRgb('white', 'rgb(178, 24, 43)')(tRed);
    } else {
      const tBlue = (t - 0.5) * 2;
      return d3.interpolateRgb('white', 'rgb(33, 102, 172)')(tBlue);
    }
  };

  // Color function for net balance view
  const colorNetBalance = (value) => {
    const transformed = symlogScale(value);
    let t;
    if (transformed < 0) {
      t = 0.5 * (1 + transformed / Math.abs(symlogMin));
    } else {
      t = 0.5 + 0.5 * (transformed / symlogMax);
    }
    t = Math.max(0, Math.min(1, t));
    return customInterpolator(t);
  };

  // Classification function for tooltips: -1 = strong donor, 0 = mixed, 1 = strong recipient
  const classify = (d) => {
    if (!d) return null;
    const ratio = d.received / (d.donated + 1); // +1 to avoid division by zero
    if (d.net < -1e9 && ratio < 0.5) return -1; // Strong donor
    if (d.net > 1e9 && ratio > 2) return 1; // Strong recipient
    return 0; // Mixed
  };

  // Build reverse map from feature ID to ISO2
  const iso2ById = new Map();
  for (const [iso2, fid] of idByIso2.entries()) {
    iso2ById.set(String(fid), iso2);
  }

  // Build feature lookup by ISO2
  const featureByIso2 = new Map();
  countries.features.forEach(f => {
    const iso2 = iso2ById.get(String(f.id));
    if (iso2) featureByIso2.set(iso2, f);
  });

  // Determine if two countries have contrasting status
  const hasContrast = (iso2a, iso2b) => {
    const da = byIso2.get(iso2a);
    const db = byIso2.get(iso2b);
    if (!da || !db) return false;
    const ca = classify(da);
    const cb = classify(db);
    // Contrast if one is donor and one is recipient
    return (ca === -1 && cb === 1) || (ca === 1 && cb === -1);
  };

  const tt = d3.select('#tooltip');

  // Create map group
  const mapG = svg.append('g');

  // Draw countries
  const countryPaths = mapG.selectAll('path.country')
    .data(countries.features)
    .join('path')
    .attr('class', 'country')
    .attr('d', path);


  // Update map colors (net balance view only)
  function updateMap() {
    countryPaths
      .attr('fill', f => {
        const id = String(f.id);
        const iso2 = iso2ById.get(id);
        if (!iso2) return 'url(#nodata-hatch)';
        const d = byIso2.get(iso2);
        if (!d) return 'url(#nodata-hatch)';
        return colorNetBalance(d.net);
      })
      .attr('stroke', f => {
        const id = String(f.id);
        const iso2 = iso2ById.get(id);
        const d = iso2 ? byIso2.get(iso2) : null;
        return d ? '#fff' : '#9ca3af';
      })
      .attr('stroke-width', 0.5);

    updateLegend();
  }

  // Highlight neighbors on hover
  function highlightNeighbors(iso2, show) {
    if (!iso2 || !neighbors[iso2]) {
      countryPaths.attr('opacity', 1);
      return;
    }

    const neighborSet = new Set(neighbors[iso2]);
    neighborSet.add(iso2); // Include self

    countryPaths.attr('opacity', f => {
      if (!show) return 1;
      const fid = String(f.id);
      const fiso2 = iso2ById.get(fid);
      return neighborSet.has(fiso2) ? 1 : 0.3;
    });
  }

  // Mouse events
  countryPaths
    .on('mouseenter', (event, f) => {
      const id = String(f.id);
      const iso2 = iso2ById.get(id);
      highlightNeighbors(iso2, true);
    })
    .on('mousemove', (event, f) => {
      const id = String(f.id);
      const iso2 = iso2ById.get(id);
      const d = iso2 ? byIso2.get(iso2) : null;
      const name = nameById.get(id) || iso2 || 'Unknown';

      let html = `<strong>${name}</strong>`;

      if (!d) {
        html += '<br/><em>No data available</em>';
      } else {
        const classification = classify(d);
        const classLabel = classification === -1 ? 'Net Donor' :
                          classification === 1 ? 'Net Recipient' : 'Mixed';
        html += `<br/>Status: <strong>${classLabel}</strong>`;
        html += `<br/>Net: ${fmtMoney(d.net)}`;
        html += `<br/>Received: ${fmtMoney(d.received)}`;
        html += `<br/>Donated: ${fmtMoney(d.donated)}`;

        // Show neighbor contrasts
        if (iso2 && neighbors[iso2]) {
          const contrastingNeighbors = neighbors[iso2].filter(n => hasContrast(iso2, n));
          if (contrastingNeighbors.length > 0) {
            const names = contrastingNeighbors.map(n => {
              const nData = byIso2.get(n);
              const nClass = classify(nData);
              return `${n} (${nClass === 1 ? 'recipient' : 'donor'})`;
            }).slice(0, 3);
            html += `<br/><em style="color:#c00">Contrasts with: ${names.join(', ')}${contrastingNeighbors.length > 3 ? '...' : ''}</em>`;
          }
        }
      }

      tt.style('opacity', 1)
        .html(html)
        .style('left', `${event.clientX + 10}px`)
        .style('top', `${event.clientY + 10}px`);
    })
    .on('mouseleave', () => {
      highlightNeighbors(null, false);
      tt.style('opacity', 0);
    });

  // Legend - render only net balance diverging legend
  function updateLegend() {
    renderDivergingLegend('#legend-diverging', colorNetBalance, symlogScale, symlogMin, symlogMax, width);
  }

  // Regional summary panel
  const summaryPanel = el.append('div')
    .attr('class', 'regional-summary')
    .style('margin-top', '16px')
    .style('padding', '12px 16px')
    .style('background', '#f8f9fa')
    .style('border-radius', '8px')
    .style('border', '1px solid #e5e7eb');

  summaryPanel.append('h4')
    .style('margin', '0 0 10px 0')
    .style('font-size', '14px')
    .style('font-weight', '600')
    .style('color', '#333')
    .text('Regional Clustering Summary');

  const summaryGrid = summaryPanel.append('div')
    .style('display', 'grid')
    .style('grid-template-columns', 'repeat(auto-fill, minmax(180px, 1fr))')
    .style('gap', '8px');

  // Calculate regional statistics
  Object.entries(regions).forEach(([region, countryCodes]) => {
    let donors = 0, recipients = 0, mixed = 0, noData = 0;

    countryCodes.forEach(iso2 => {
      const d = byIso2.get(iso2);
      if (!d) {
        noData++;
      } else {
        const c = classify(d);
        if (c === -1) donors++;
        else if (c === 1) recipients++;
        else mixed++;
      }
    });

    const total = donors + recipients + mixed;
    if (total === 0) return;

    const donorPct = Math.round((donors / total) * 100);
    const recipientPct = Math.round((recipients / total) * 100);

    // Determine dominant type
    let dominantColor, dominantLabel;
    if (donorPct > 60) {
      dominantColor = '#b91c1c';
      dominantLabel = `${donorPct}% donors`;
    } else if (recipientPct > 60) {
      dominantColor = '#1d4ed8';
      dominantLabel = `${recipientPct}% recipients`;
    } else {
      dominantColor = '#666';
      dominantLabel = 'Mixed';
    }

    const regionDiv = summaryGrid.append('div')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('gap', '8px')
      .style('font-size', '12px');

    regionDiv.append('span')
      .style('width', '10px')
      .style('height', '10px')
      .style('border-radius', '2px')
      .style('background', dominantColor)
      .style('flex-shrink', '0');

    regionDiv.append('span')
      .style('font-weight', '500')
      .style('color', '#333')
      .text(region + ':');

    regionDiv.append('span')
      .style('color', dominantColor)
      .style('font-weight', '600')
      .text(dominantLabel);
  });

  // Initial render
  updateMap();
}


function drawPurposeMaps(countries, purposesData, idByIso2, nameById, topDonorsByRecipientPurpose) {
  const root = d3.select('#purposes-multiples');
  root.selectAll('*').remove();

  const purposes = purposesData.purposes || [];
  if (purposes.length === 0) return;

  // Regional groupings for concentration analysis
  const regions = {
    'Sub-Saharan Africa': ['AO', 'BF', 'BI', 'BJ', 'BW', 'CD', 'CF', 'CG', 'CI', 'CM', 'CV', 'DJ', 'ER', 'ET', 'GA', 'GH', 'GM', 'GN', 'GQ', 'GW', 'KE', 'KM', 'LR', 'LS', 'MG', 'ML', 'MR', 'MU', 'MW', 'MZ', 'NA', 'NE', 'NG', 'RW', 'SC', 'SD', 'SL', 'SN', 'SO', 'SS', 'ST', 'SZ', 'TD', 'TG', 'TZ', 'UG', 'ZA', 'ZM', 'ZW'],
    'South Asia': ['AF', 'BD', 'BT', 'IN', 'LK', 'MV', 'NP', 'PK'],
    'East Asia & Pacific': ['CN', 'FJ', 'ID', 'KH', 'KI', 'KP', 'LA', 'MH', 'MM', 'MN', 'MY', 'PG', 'PH', 'PW', 'SB', 'TH', 'TL', 'TO', 'TV', 'VN', 'VU', 'WS'],
    'Middle East & N. Africa': ['DZ', 'EG', 'EH', 'IQ', 'IR', 'JO', 'LB', 'LY', 'MA', 'PS', 'SA', 'SY', 'TN', 'YE'],
    'Latin America & Caribbean': ['AR', 'BO', 'BR', 'BZ', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'GD', 'GT', 'GY', 'HN', 'HT', 'JM', 'MX', 'NI', 'PA', 'PE', 'PY', 'SR', 'SV', 'TT', 'UY', 'VE'],
    'Europe & Central Asia': ['AL', 'AM', 'AZ', 'BA', 'BY', 'GE', 'KG', 'KZ', 'MD', 'ME', 'MK', 'RS', 'TJ', 'TM', 'TR', 'UA', 'UZ', 'XK']
  };

  // Comprehensive ISO2 to country name mapping
  const iso2ToName = new Map([
    ['AF', 'Afghanistan'], ['AL', 'Albania'], ['DZ', 'Algeria'], ['AO', 'Angola'], ['AR', 'Argentina'],
    ['AM', 'Armenia'], ['AU', 'Australia'], ['AT', 'Austria'], ['AZ', 'Azerbaijan'], ['BD', 'Bangladesh'],
    ['BY', 'Belarus'], ['BE', 'Belgium'], ['BJ', 'Benin'], ['BT', 'Bhutan'], ['BO', 'Bolivia'],
    ['BA', 'Bosnia'], ['BW', 'Botswana'], ['BR', 'Brazil'], ['BN', 'Brunei'], ['BG', 'Bulgaria'],
    ['BF', 'Burkina Faso'], ['BI', 'Burundi'], ['KH', 'Cambodia'], ['CM', 'Cameroon'], ['CA', 'Canada'],
    ['CF', 'Central African Rep.'], ['TD', 'Chad'], ['CL', 'Chile'], ['CN', 'China'], ['CO', 'Colombia'],
    ['CG', 'Congo'], ['CD', 'DR Congo'], ['CR', 'Costa Rica'], ['CI', "Côte d'Ivoire"], ['HR', 'Croatia'],
    ['CU', 'Cuba'], ['CY', 'Cyprus'], ['CZ', 'Czech Republic'], ['DK', 'Denmark'], ['DJ', 'Djibouti'],
    ['DO', 'Dominican Rep.'], ['EC', 'Ecuador'], ['EG', 'Egypt'], ['SV', 'El Salvador'], ['GQ', 'Eq. Guinea'],
    ['ER', 'Eritrea'], ['EE', 'Estonia'], ['ET', 'Ethiopia'], ['FJ', 'Fiji'], ['FI', 'Finland'],
    ['FR', 'France'], ['GA', 'Gabon'], ['GM', 'Gambia'], ['GE', 'Georgia'], ['DE', 'Germany'],
    ['GH', 'Ghana'], ['GR', 'Greece'], ['GT', 'Guatemala'], ['GN', 'Guinea'], ['GW', 'Guinea-Bissau'],
    ['GY', 'Guyana'], ['HT', 'Haiti'], ['HN', 'Honduras'], ['HU', 'Hungary'], ['IS', 'Iceland'],
    ['IN', 'India'], ['ID', 'Indonesia'], ['IR', 'Iran'], ['IQ', 'Iraq'], ['IE', 'Ireland'],
    ['IL', 'Israel'], ['IT', 'Italy'], ['JM', 'Jamaica'], ['JP', 'Japan'], ['JO', 'Jordan'],
    ['KZ', 'Kazakhstan'], ['KE', 'Kenya'], ['KI', 'Kiribati'], ['KP', 'North Korea'], ['KR', 'South Korea'],
    ['KW', 'Kuwait'], ['KG', 'Kyrgyzstan'], ['LA', 'Laos'], ['LV', 'Latvia'], ['LB', 'Lebanon'],
    ['LS', 'Lesotho'], ['LR', 'Liberia'], ['LY', 'Libya'], ['LT', 'Lithuania'], ['LU', 'Luxembourg'],
    ['MG', 'Madagascar'], ['MW', 'Malawi'], ['MY', 'Malaysia'], ['MV', 'Maldives'], ['ML', 'Mali'],
    ['MT', 'Malta'], ['MR', 'Mauritania'], ['MU', 'Mauritius'], ['MX', 'Mexico'], ['MD', 'Moldova'],
    ['MN', 'Mongolia'], ['ME', 'Montenegro'], ['MA', 'Morocco'], ['MZ', 'Mozambique'], ['MM', 'Myanmar'],
    ['NA', 'Namibia'], ['NP', 'Nepal'], ['NL', 'Netherlands'], ['NZ', 'New Zealand'], ['NI', 'Nicaragua'],
    ['NE', 'Niger'], ['NG', 'Nigeria'], ['NO', 'Norway'], ['OM', 'Oman'], ['PK', 'Pakistan'],
    ['PA', 'Panama'], ['PG', 'Papua New Guinea'], ['PY', 'Paraguay'], ['PE', 'Peru'], ['PH', 'Philippines'],
    ['PL', 'Poland'], ['PT', 'Portugal'], ['QA', 'Qatar'], ['RO', 'Romania'], ['RU', 'Russia'],
    ['RW', 'Rwanda'], ['SA', 'Saudi Arabia'], ['SN', 'Senegal'], ['RS', 'Serbia'], ['SL', 'Sierra Leone'],
    ['SG', 'Singapore'], ['SK', 'Slovakia'], ['SI', 'Slovenia'], ['SB', 'Solomon Islands'], ['SO', 'Somalia'],
    ['ZA', 'South Africa'], ['SS', 'South Sudan'], ['ES', 'Spain'], ['LK', 'Sri Lanka'], ['SD', 'Sudan'],
    ['SR', 'Suriname'], ['SZ', 'Eswatini'], ['SE', 'Sweden'], ['CH', 'Switzerland'], ['SY', 'Syria'],
    ['TW', 'Taiwan'], ['TJ', 'Tajikistan'], ['TZ', 'Tanzania'], ['TH', 'Thailand'], ['TL', 'Timor-Leste'],
    ['TG', 'Togo'], ['TO', 'Tonga'], ['TT', 'Trinidad & Tobago'], ['TN', 'Tunisia'], ['TR', 'Turkey'],
    ['TM', 'Turkmenistan'], ['UG', 'Uganda'], ['UA', 'Ukraine'], ['AE', 'UAE'], ['GB', 'United Kingdom'],
    ['US', 'United States'], ['UY', 'Uruguay'], ['UZ', 'Uzbekistan'], ['VU', 'Vanuatu'], ['VE', 'Venezuela'],
    ['VN', 'Vietnam'], ['YE', 'Yemen'], ['ZM', 'Zambia'], ['ZW', 'Zimbabwe'], ['PS', 'Palestine'],
    ['XK', 'Kosovo'], ['MK', 'North Macedonia']
  ]);

  // Create compact layout with dropdown selector for dashboard
  const container = root.append('div').attr('class', 'purpose-compact-container');

  // Dropdown selector instead of side menu
  const selectorRow = container.append('div')
    .style('display', 'flex')
    .style('align-items', 'center')
    .style('gap', '10px')
    .style('margin-bottom', '10px');

  selectorRow.append('label')
    .style('font-size', '0.85rem')
    .style('color', '#666')
    .text('Purpose:');

  const dropdown = selectorRow.append('select')
    .attr('class', 'purpose-dropdown')
    .style('padding', '4px 8px')
    .style('border-radius', '4px')
    .style('border', '1px solid #d1d5db')
    .style('font-size', '0.85rem')
    .style('background', 'white')
    .style('cursor', 'pointer');

  // Map container
  const mapContainer = container.append('div');

  // Stats panel below map
  const statsPanel = container.append('div')
    .attr('class', 'purpose-stats-panel')
    .style('display', 'flex')
    .style('gap', '20px')
    .style('margin-top', '10px')
    .style('flex-wrap', 'wrap');

  // Build reverse map from feature ID to ISO2 upfront
  const iso2ById = new Map();
  for (const [iso2, fid] of idByIso2.entries()) {
    iso2ById.set(String(fid), iso2);
  }

  const tt = d3.select('#tooltip');

  // Function to draw a single purpose map
  function drawPurposeMap(purpose) {
    mapContainer.selectAll('*').remove();
    statsPanel.selectAll('*').remove();

    const width = mapContainer.node().getBoundingClientRect().width || 500;
    const height = Math.floor(width * 0.55);

    const svg = mapContainer.append('svg').attr('width', width).attr('height', height);

    // Add hatching pattern for no-data countries
    const defs = svg.append('defs');
    const pattern = defs.append('pattern')
      .attr('id', 'purpose-nodata-hatch')
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('width', 6)
      .attr('height', 6);
    pattern.append('rect')
      .attr('width', 6)
      .attr('height', 6)
      .attr('fill', '#e5e7eb');
    pattern.append('path')
      .attr('d', 'M0,6 L6,0')
      .attr('stroke', '#c0c0c0')
      .attr('stroke-width', 1);

    const path = d3.geoPath(d3.geoNaturalEarth1().fitSize([width, height], countries));

    const recMap = purposesData.per_purpose[purpose] || {};

    // Get values > 0 for scale calculation
    const positiveValues = Object.values(recMap).filter(v => v > 0);
    if (positiveValues.length === 0) {
      svg.append('g')
        .selectAll('path')
        .data(countries.features)
        .join('path')
        .attr('class', 'country')
        .attr('d', path)
        .attr('fill', 'url(#purpose-nodata-hatch)')
        .attr('stroke', '#ccc')
        .attr('stroke-width', 0.5);
      return;
    }

    const purposeMaxVal = d3.max(positiveValues);
    const purposeMinVal = d3.min(positiveValues);

    // Use log scale for better color distribution
    const logScale = d3.scaleLog()
      .domain([Math.max(1, purposeMinVal), purposeMaxVal])
      .range([0, 1])
      .clamp(true);

    // Color function using log scale
    const color = (val) => {
      if (!val || val <= 0) return null;
      const t = logScale(val);
      return d3.interpolateBlues(0.2 + t * 0.8);
    };

    svg.append('g')
      .selectAll('path')
      .data(countries.features)
      .join('path')
      .attr('class', 'country')
      .attr('d', path)
      .attr('fill', f => {
        const id = String(f.id);
        const iso2 = iso2ById.get(id);
        const val = iso2 ? recMap[iso2] : undefined;
        const c = color(val);
        return c || 'url(#purpose-nodata-hatch)';
      })
      .attr('stroke', f => {
        const id = String(f.id);
        const iso2 = iso2ById.get(id);
        const val = iso2 ? recMap[iso2] : undefined;
        return val && val > 0 ? '#fff' : '#bbb';
      })
      .attr('stroke-width', 0.5)
      .on('mousemove', (event, f) => {
        const id = String(f.id);
        const iso2 = iso2ById.get(id);
        const name = nameById.get(id) || iso2 || 'Unknown';
        const val = iso2 ? recMap[iso2] : 0;

        let html = `<strong>${name}</strong>`;

        if (!val || val <= 0) {
          html += `<br/><em>No aid received for this purpose</em>`;
        } else {
          html += `<br/>Received: ${fmtMoney(val)}`;

          const topDonors = topDonorsByRecipientPurpose?.[iso2]?.[purpose];
          if (topDonors && topDonors.length > 0) {
            html += `<br/><br/><strong>Top Donors:</strong>`;
            topDonors.forEach(([donorIso, amount], i) => {
              const donorName = iso2ToName.get(donorIso) || donorIso;
              html += `<br/>${i + 1}. ${donorName}: ${fmtMoney(amount)}`;
            });
          }
        }

        tt.style('opacity', 1)
          .html(html)
          .style('left', `${event.clientX + 10}px`)
          .style('top', `${event.clientY + 10}px`);
      })
      .on('mouseleave', () => tt.style('opacity', 0));

    // Update legend
    renderSequentialLogLegend('#legend-seq', purposeMinVal, purposeMaxVal, Math.min(360, width - 40));

    // === STATS PANELS ===

    // Calculate total for this purpose
    const purposeTotal = Object.values(recMap).reduce((sum, v) => sum + (v || 0), 0);

    // --- Top 5 Recipients ---
    const topRecipientsPanel = statsPanel.append('div')
      .style('flex', '1')
      .style('min-width', '200px')
      .style('background', '#f8f9fa')
      .style('border-radius', '6px')
      .style('padding', '8px 12px')
      .style('border', '1px solid #e5e7eb');

    topRecipientsPanel.append('h4')
      .style('margin', '0 0 8px 0')
      .style('font-size', '12px')
      .style('font-weight', '600')
      .style('color', '#333')
      .text('Top 5 Recipients');

    const sortedRecipients = Object.entries(recMap)
      .filter(([, val]) => val > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const recipientList = topRecipientsPanel.append('div');

    sortedRecipients.forEach(([iso2, amount], i) => {
      const countryName = iso2ToName.get(iso2) || iso2;
      const pct = ((amount / purposeTotal) * 100).toFixed(1);

      const row = recipientList.append('div')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('margin-bottom', '4px')
        .style('font-size', '11px');

      row.append('span')
        .style('width', '20px')
        .style('font-weight', '600')
        .style('color', '#666')
        .text(`${i + 1}.`);

      row.append('span')
        .style('flex', '1')
        .style('color', '#333')
        .text(countryName);

      row.append('span')
        .style('width', '70px')
        .style('text-align', 'right')
        .style('font-weight', '500')
        .style('color', '#2563eb')
        .text(fmtAxisMoney(amount));

      row.append('span')
        .style('width', '45px')
        .style('text-align', 'right')
        .style('color', '#666')
        .text(`${pct}%`);
    });

    // --- Regional Concentration ---
    const regionalPanel = statsPanel.append('div')
      .style('flex', '1')
      .style('min-width', '220px')
      .style('background', '#f8f9fa')
      .style('border-radius', '6px')
      .style('padding', '8px 12px')
      .style('border', '1px solid #e5e7eb');

    regionalPanel.append('h4')
      .style('margin', '0 0 8px 0')
      .style('font-size', '12px')
      .style('font-weight', '600')
      .style('color', '#333')
      .text('Regional Distribution');

    // Calculate regional totals
    const regionalTotals = {};
    Object.entries(regions).forEach(([region, countryCodes]) => {
      let total = 0;
      countryCodes.forEach(iso2 => {
        if (recMap[iso2]) total += recMap[iso2];
      });
      if (total > 0) regionalTotals[region] = total;
    });

    const sortedRegions = Object.entries(regionalTotals)
      .sort((a, b) => b[1] - a[1]);

    // Create bar chart for regional distribution
    const barHeight = 18;
    const barMargin = { left: 110, right: 50 };
    const barWidth = 80;
    const chartHeight = sortedRegions.length * barHeight + 5;

    const barSvg = regionalPanel.append('svg')
      .attr('width', barMargin.left + barWidth + barMargin.right)
      .attr('height', chartHeight);

    const maxRegionalVal = d3.max(sortedRegions, d => d[1]) || 1;
    const xScale = d3.scaleLinear()
      .domain([0, maxRegionalVal])
      .range([0, barWidth]);

    sortedRegions.forEach(([region, amount], i) => {
      const pct = ((amount / purposeTotal) * 100).toFixed(1);
      const row = barSvg.append('g')
        .attr('transform', `translate(0, ${i * barHeight + 2})`);

      // Region label (shortened)
      const shortRegion = region.replace(' & ', '/').replace('Latin America', 'LatAm').replace('Sub-Saharan', 'SSA');
      row.append('text')
        .attr('x', barMargin.left - 6)
        .attr('y', barHeight / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '10px')
        .attr('fill', '#333')
        .text(shortRegion);

      // Bar
      row.append('rect')
        .attr('x', barMargin.left)
        .attr('y', 3)
        .attr('width', xScale(amount))
        .attr('height', barHeight - 6)
        .attr('fill', '#2563eb')
        .attr('opacity', 0.7)
        .attr('rx', 2);

      // Percentage label
      row.append('text')
        .attr('x', barMargin.left + xScale(amount) + 4)
        .attr('y', barHeight / 2)
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .attr('fill', '#2563eb')
        .text(`${pct}%`);
    });
  }

  // Populate dropdown
  purposes.forEach((purpose, i) => {
    dropdown.append('option')
      .attr('value', purpose)
      .text(purpose.length > 30 ? purpose.substring(0, 28) + '...' : purpose);
  });

  // Handle dropdown change
  dropdown.on('change', function() {
    const selected = this.value;
    drawPurposeMap(selected);
  });

  // Draw the first purpose by default
  drawPurposeMap(purposes[0]);
}

// Sequential log legend for purpose maps
function renderSequentialLogLegend(sel, minVal, maxVal, width) {
  const w = width;
  const h = 60;
  const svg = d3.select(sel).html('').append('svg').attr('width', w + 80).attr('height', h);
  const margin = { left: 20, right: 20 };
  const innerW = w - margin.left - margin.right;

  const defs = svg.append('defs');

  // Hatching pattern for "no data"
  const pattern = defs.append('pattern')
    .attr('id', 'legend-purpose-hatch')
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('width', 4)
    .attr('height', 4);
  pattern.append('rect').attr('width', 4).attr('height', 4).attr('fill', '#e5e7eb');
  pattern.append('path').attr('d', 'M0,4 L4,0').attr('stroke', '#c0c0c0').attr('stroke-width', 0.8);

  // Gradient
  const grad = defs.append('linearGradient').attr('id', 'lg-seq-log').attr('x1', '0%').attr('x2', '100%');
  const numStops = 10;
  for (let i = 0; i <= numStops; i++) {
    const t = i / numStops;
    grad.append('stop')
      .attr('offset', t)
      .attr('stop-color', d3.interpolateBlues(0.2 + t * 0.8));
  }

  svg.append('rect')
    .attr('x', margin.left).attr('y', 12)
    .attr('width', innerW).attr('height', 12)
    .attr('fill', 'url(#lg-seq-log)');

  // Log scale for tick positions
  const logScale = d3.scaleLog()
    .domain([Math.max(1, minVal), maxVal])
    .range([margin.left, margin.left + innerW]);

  // Generate nice tick values
  const tickValues = [];
  let magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(1, minVal))));
  while (magnitude <= maxVal) {
    [1, 2, 5].forEach(m => {
      const val = m * magnitude;
      if (val >= minVal && val <= maxVal) {
        tickValues.push(val);
      }
    });
    magnitude *= 10;
  }

  // Draw tick marks and labels (limit to ~5 ticks)
  const selectedTicks = tickValues.length <= 6 ? tickValues :
    tickValues.filter((_, i) => i % Math.ceil(tickValues.length / 5) === 0);

  const tickG = svg.append('g').attr('class', 'axis');
  selectedTicks.forEach(val => {
    const xPos = logScale(val);
    tickG.append('line')
      .attr('x1', xPos).attr('x2', xPos)
      .attr('y1', 24).attr('y2', 28)
      .attr('stroke', '#666');
    tickG.append('text')
      .attr('x', xPos)
      .attr('y', 40)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#666')
      .text(fmtAxisMoney(val));
  });

  // "No data" indicator
  const noDataX = margin.left + innerW + 15;
  svg.append('rect')
    .attr('x', noDataX).attr('y', 12)
    .attr('width', 20).attr('height', 12)
    .attr('fill', 'url(#legend-purpose-hatch)')
    .attr('stroke', '#bbb')
    .attr('stroke-width', 0.5);
  svg.append('text')
    .attr('x', noDataX + 25)
    .attr('y', 22)
    .attr('font-size', '10px')
    .attr('fill', '#666')
    .text('No data');
}

function renderDivergingLegend(sel, color, symlogScale, symlogMin, symlogMax, width) {
  const w = Math.min(400, width - 40);
  const h = 60;
  const svg = d3.select(sel).html('').append('svg').attr('width', w).attr('height', h);
  const margin = { left: 20, right: 20 };
  const innerW = w - margin.left - margin.right;

  // Create gradient with many stops to show the symlog scale properly
  const defs = svg.append('defs');
  const grad = defs.append('linearGradient').attr('id', 'lg-div').attr('x1', '0%').attr('x2', '100%');

  // Sample many points along the scale for smooth gradient
  const numStops = 20;
  for (let i = 0; i <= numStops; i++) {
    const t = i / numStops;
    // Map t back to a value in the symlog space, then to actual value
    const symlogVal = symlogMin + t * (symlogMax - symlogMin);
    // Inverse symlog to get actual value
    const sign = symlogVal < 0 ? -1 : 1;
    const actualVal = sign * (Math.exp(Math.abs(symlogVal)) - 1) * 1e9;
    grad.append('stop')
      .attr('offset', t)
      .attr('stop-color', color(actualVal));
  }

  svg.append('rect')
    .attr('x', margin.left).attr('y', 12)
    .attr('width', innerW).attr('height', 12)
    .attr('fill', 'url(#lg-div)');

  // Create axis using symlog scale
  // Key tick values in actual dollars
  const tickValues = [-500e9, -100e9, -10e9, -1e9, 0, 1e9, 10e9, 100e9];

  // Map actual values to pixel positions via symlog
  const valueToPixel = (val) => {
    const symVal = symlogScale(val);
    const t = (symVal - symlogMin) / (symlogMax - symlogMin);
    return margin.left + t * innerW;
  };

  // Draw tick marks and labels
  const tickG = svg.append('g').attr('class', 'axis');
  tickValues.forEach(val => {
    const xPos = valueToPixel(val);
    if (xPos >= margin.left && xPos <= margin.left + innerW) {
      tickG.append('line')
        .attr('x1', xPos).attr('x2', xPos)
        .attr('y1', 24).attr('y2', 28)
        .attr('stroke', '#666');
      tickG.append('text')
        .attr('x', xPos)
        .attr('y', 40)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', '#666')
        .text(fmtAxisMoney(val));
    }
  });

  // Add "No Data" indicator with hatching
  const noDataX = margin.left + innerW + 15;
  const patternDef = defs.append('pattern')
    .attr('id', 'legend-hatch')
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('width', 4)
    .attr('height', 4);
  patternDef.append('rect').attr('width', 4).attr('height', 4).attr('fill', '#d1d5db');
  patternDef.append('path').attr('d', 'M0,4 L4,0').attr('stroke', '#9ca3af').attr('stroke-width', 0.8);

  svg.append('rect')
    .attr('x', noDataX).attr('y', 12)
    .attr('width', 20).attr('height', 12)
    .attr('fill', 'url(#legend-hatch)')
    .attr('stroke', '#9ca3af')
    .attr('stroke-width', 0.5);
  svg.append('text')
    .attr('x', noDataX + 25)
    .attr('y', 22)
    .attr('font-size', '10px')
    .attr('fill', '#666')
    .text('No data');
}

function renderSequentialLegend(sel, color, width) {
  const w = width;
  const h = 44;
  const svg = d3.select(sel).html('').append('svg').attr('width', w).attr('height', h);
  const margin = { left: 20, right: 20 };
  const innerW = w - margin.left - margin.right;

  const defs = svg.append('defs');
  const grad = defs.append('linearGradient').attr('id', 'lg-seq').attr('x1', '0%').attr('x2', '100%');
  d3.range(0, 1.001, 0.1).forEach(t => grad.append('stop').attr('offset', t).attr('stop-color', color(color.domain()[0] + t * (color.domain()[1] - color.domain()[0]))));

  svg.append('rect')
    .attr('x', margin.left).attr('y', 12)
    .attr('width', innerW).attr('height', 10)
    .attr('fill', 'url(#lg-seq)');

  const scale = d3.scaleLinear().domain(color.domain()).range([margin.left, margin.left + innerW]);
  const axis = d3.axisBottom(scale).ticks(4).tickFormat(d => fmtAxisMoney(d));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${12 + 10})`).call(axis);
}

function fmtMoney(x) {
  const abs = Math.abs(x);
  const sign = x < 0 ? '-' : '';

  if (abs >= 1e12) {
    return sign + (abs / 1e12).toFixed(2) + ' Trillion USD';
  } else if (abs >= 1e9) {
    return sign + (abs / 1e9).toFixed(2) + ' Billion USD';
  } else if (abs >= 1e6) {
    return sign + (abs / 1e6).toFixed(2) + ' Million USD';
  } else if (abs >= 1e3) {
    return sign + (abs / 1e3).toFixed(2) + ' Thousand USD';
  } else {
    return sign + abs.toFixed(2) + ' USD';
  }
}

function fmtAxisMoney(x) {
  const abs = Math.abs(x);
  const sign = x < 0 ? '-' : '';

  let value, suffix;

  if (abs >= 1e12) {
    value = abs / 1e12;
    suffix = 'T';
  } else if (abs >= 1e9) {
    value = abs / 1e9;
    suffix = 'B';
  } else if (abs >= 1e6) {
    value = abs / 1e6;
    suffix = 'M';
  } else if (abs >= 1e3) {
    value = abs / 1e3;
    suffix = 'K';
  } else {
    return sign + abs.toFixed(0);
  }

  // Remove .0 if it's a whole number
  const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
  return sign + formatted + suffix;
}

// Chord Diagram: Aid flow network between top donors and recipients
function drawChordDiagram(chordData) {
  if (!chordData || !chordData.matrix || !chordData.countries) {
    d3.select('#chord-diagram').html('<p style="color:#666;">Chord data not available. Re-run aggregation script.</p>');
    return;
  }

  const container = d3.select('#chord-diagram');
  const containerWidth = container.node()?.getBoundingClientRect().width || 900;

  const width = containerWidth || 500;
  const height = Math.min(width, 500);
  const outerRadius = Math.min(width, height) * 0.5 - 70;
  const innerRadius = outerRadius - 15;

  const { countries, names, roles, matrix, totals } = chordData;
  const n = countries.length;

  // Color schemes for donor/recipient/mixed
  const roleColors = {
    donor: '#dc2626',      // Red for donors
    recipient: '#2563eb',   // Blue for recipients
    mixed: '#7c3aed'        // Purple for mixed
  };

  // Create color scale for individual countries based on role
  const countryColor = (iso2) => {
    const role = roles[iso2] || 'mixed';
    return roleColors[role];
  };

  const svg = container.html('')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [-width / 2, -height / 2, width, height])
    .attr('style', 'max-width: 100%; height: auto;');

  // Tooltip
  const tooltip = d3.select('#tooltip');

  // Create chord layout
  const chord = d3.chord()
    .padAngle(0.04)
    .sortSubgroups(d3.descending)
    .sortChords(d3.descending);

  const chords = chord(matrix);

  // Arc generator for the outer ring
  const arc = d3.arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius);

  // Ribbon generator for the chords
  const ribbon = d3.ribbon()
    .radius(innerRadius - 1);

  // Filter checkbox handling
  const filterCheckbox = d3.select('#chord-filter-small');
  let filterSmallFlows = false;

  // Calculate max flow for filtering
  const maxFlow = d3.max(chords.flatMap(c => [c.source.value, c.target.value])) || 1;
  const filterThreshold = maxFlow * 0.01;

  // Draw the outer arcs (country segments)
  const group = svg.append('g')
    .attr('class', 'chord-groups')
    .selectAll('g')
    .data(chords.groups)
    .join('g')
    .attr('class', 'chord-group');

  group.append('path')
    .attr('class', 'chord-arc')
    .attr('fill', d => countryColor(countries[d.index]))
    .attr('stroke', d => d3.color(countryColor(countries[d.index])).darker(0.5))
    .attr('d', arc)
    .on('mouseover', function(event, d) {
      const iso2 = countries[d.index];
      const name = names[iso2] || iso2;
      const role = roles[iso2] || 'unknown';
      const t = totals[iso2] || { donated: 0, received: 0 };

      // Highlight connected chords
      svg.selectAll('.chord-ribbon')
        .transition().duration(200)
        .attr('opacity', c => (c.source.index === d.index || c.target.index === d.index) ? 0.85 : 0.1);

      tooltip
        .html(`
          <strong>${name}</strong> (${iso2})<br/>
          Role: <span style="color:${roleColors[role]}; font-weight:600;">${role}</span><br/>
          Total donated: $${fmtMoney(t.donated)}<br/>
          Total received: $${fmtMoney(t.received)}
        `)
        .style('opacity', 1)
        .style('left', (event.pageX + 12) + 'px')
        .style('top', (event.pageY - 10) + 'px');
    })
    .on('mouseout', function() {
      svg.selectAll('.chord-ribbon')
        .transition().duration(200)
        .attr('opacity', d => {
          if (filterSmallFlows && d.source.value < filterThreshold) return 0;
          return 0.65;
        });
      tooltip.style('opacity', 0);
    });

  // Add country labels
  group.append('text')
    .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
    .attr('dy', '0.35em')
    .attr('transform', d => `
      rotate(${(d.angle * 180 / Math.PI - 90)})
      translate(${outerRadius + 8})
      ${d.angle > Math.PI ? 'rotate(180)' : ''}
    `)
    .attr('text-anchor', d => d.angle > Math.PI ? 'end' : null)
    .attr('font-size', '10px')
    .attr('fill', '#333')
    .text(d => {
      const iso2 = countries[d.index];
      // Use short name or ISO code for space
      return names[iso2]?.length > 12 ? iso2 : (names[iso2] || iso2);
    });

  // Draw the chords (flows)
  const ribbons = svg.append('g')
    .attr('class', 'chord-ribbons')
    .selectAll('path')
    .data(chords)
    .join('path')
    .attr('class', 'chord-ribbon')
    .attr('d', ribbon)
    .attr('opacity', 0.65)
    .style('pointer-events', 'all')
    .attr('fill', d => {
      // Color by the larger flow direction (donor -> recipient)
      const sourceRole = roles[countries[d.source.index]];
      const targetRole = roles[countries[d.target.index]];
      // If source is donor, use source color; otherwise use target
      if (sourceRole === 'donor') return countryColor(countries[d.source.index]);
      if (targetRole === 'donor') return countryColor(countries[d.target.index]);
      return countryColor(countries[d.source.index]);
    })
    .attr('stroke', d => d3.color(countryColor(countries[d.source.index])).darker(0.3))
    .attr('stroke-width', 0.5)
    .on('mouseover', function(event, d) {
      const sourceIso = countries[d.source.index];
      const targetIso = countries[d.target.index];
      const sourceName = names[sourceIso] || sourceIso;
      const targetName = names[targetIso] || targetIso;
      const sourceRole = roles[sourceIso];
      const targetRole = roles[targetIso];

      d3.select(this).attr('opacity', 1).attr('stroke-width', 1.5);

      // Show bidirectional flow info with clear direction
      const sourceToTarget = matrix[d.source.index][d.target.index];
      const targetToSource = matrix[d.target.index][d.source.index];

      // Build tooltip with clear flow direction
      let tooltipHtml = `<div style="margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid #eee;">
        <strong>${sourceName}</strong> ↔ <strong>${targetName}</strong>
      </div>`;

      // Show the larger flow first (primary direction)
      if (sourceToTarget > 0) {
        const arrow = sourceRole === 'donor' ? '→' : '←';
        tooltipHtml += `<div style="margin: 4px 0;">
          <span style="color: #dc2626;">●</span> ${sourceName} donated to ${targetName}:<br/>
          <strong style="font-size: 14px; margin-left: 12px;">$${fmtMoney(sourceToTarget)}</strong>
        </div>`;
      }

      if (targetToSource > 0) {
        tooltipHtml += `<div style="margin: 4px 0;">
          <span style="color: #2563eb;">●</span> ${targetName} donated to ${sourceName}:<br/>
          <strong style="font-size: 14px; margin-left: 12px;">$${fmtMoney(targetToSource)}</strong>
        </div>`;
      }

      // If no flow in either direction
      if (sourceToTarget === 0 && targetToSource === 0) {
        tooltipHtml += `<div style="color: #666;">No direct aid flow between these countries</div>`;
      }

      tooltip
        .html(tooltipHtml)
        .style('opacity', 1)
        .style('left', (event.pageX + 12) + 'px')
        .style('top', (event.pageY - 10) + 'px');
    })
    .on('mousemove', function(event) {
      tooltip
        .style('left', (event.pageX + 12) + 'px')
        .style('top', (event.pageY - 10) + 'px');
    })
    .on('mouseout', function() {
      d3.select(this)
        .attr('opacity', d => {
          if (filterSmallFlows && d.source.value < filterThreshold) return 0;
          return 0.65;
        })
        .attr('stroke-width', 0.5);
      tooltip.style('opacity', 0);
    });

  // Filter toggle handler
  filterCheckbox.on('change', function() {
    filterSmallFlows = this.checked;
    ribbons.transition().duration(300)
      .attr('opacity', d => {
        if (filterSmallFlows && d.source.value < filterThreshold) return 0;
        return 0.65;
      });
  });

  // Draw legend
  renderChordLegend();
}

// Legend for chord diagram
function renderChordLegend() {
  const legend = d3.select('#chord-legend').html('');

  const roleColors = {
    donor: '#dc2626',
    recipient: '#2563eb',
    mixed: '#7c3aed'
  };

  const roleLabels = {
    donor: 'Net Donor (donates > 2x what received)',
    recipient: 'Net Recipient (receives > 2x what donated)',
    mixed: 'Mixed (similar donated/received)'
  };

  const items = legend.selectAll('.legend-item')
    .data(Object.entries(roleColors))
    .join('div')
    .attr('class', 'chord-legend-item')
    .style('display', 'inline-flex')
    .style('align-items', 'center')
    .style('margin-right', '20px')
    .style('margin-top', '10px');

  items.append('div')
    .style('width', '16px')
    .style('height', '16px')
    .style('border-radius', '3px')
    .style('background-color', d => d[1])
    .style('margin-right', '6px');

  items.append('span')
    .style('font-size', '12px')
    .style('color', '#666')
    .text(d => roleLabels[d[0]]);
}

// Temporal Stacked Area Chart: Aid priorities over time
function drawTemporalChart(data) {
  const container = d3.select('#temporal-chart');
  const tooltip = d3.select('#tooltip');

  // Get container dimensions
  const containerWidth = container.node().getBoundingClientRect().width || 900;
  const margin = { top: 20, right: 200, bottom: 50, left: 80 };
  const width = containerWidth - margin.left - margin.right;
  const height = 350 - margin.top - margin.bottom;

  // Clear any existing content
  container.html('');

  const svg = container.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Process data: pivot from long format to wide format
  const { years, purposes, data: rawData } = data;

  // Filter to years with meaningful data (1973+ has more coverage)
  const minYear = 1973;
  const filteredYears = years.filter(y => y >= minYear);

  // Create a map for quick lookup
  const dataMap = new Map();
  rawData.forEach(d => {
    const key = `${d.year}-${d.purpose}`;
    dataMap.set(key, d.amount);
  });

  // Build wide-format data for stacking
  const wideData = filteredYears.map(year => {
    const row = { year };
    purposes.forEach(purpose => {
      row[purpose] = dataMap.get(`${year}-${purpose}`) || 0;
    });
    return row;
  });

  // Color scale - use a categorical scheme with good differentiation
  const colorScale = d3.scaleOrdinal()
    .domain(purposes)
    .range([
      '#2563eb', // Industrial development - blue
      '#dc2626', // Road transport - red
      '#059669', // Sectors not specified - green
      '#7c3aed', // Economic policy - purple
      '#ea580c', // Debt forgiveness - orange
      '#0891b2', // General budget support - cyan
      '#4f46e5', // Financial intermediaries - indigo
      '#ca8a04', // Power generation - yellow
      '#be185d', // Multisector aid - pink
      '#65a30d', // Material relief - lime
      '#6b7280'  // Other - gray
    ]);

  // Create stack generator
  const stack = d3.stack()
    .keys(purposes)
    .order(d3.stackOrderDescending)
    .offset(d3.stackOffsetNone);

  let stackedData = stack(wideData);
  let normalized = false;

  // X scale - years
  const x = d3.scaleLinear()
    .domain(d3.extent(filteredYears))
    .range([0, width]);

  // Y scale - will be updated based on normalization
  let y = d3.scaleLinear()
    .domain([0, d3.max(stackedData, layer => d3.max(layer, d => d[1]))])
    .range([height, 0]);

  // Area generator
  const area = d3.area()
    .x(d => x(d.data.year))
    .y0(d => y(d[0]))
    .y1(d => y(d[1]))
    .curve(d3.curveMonotoneX);

  // X axis
  const xAxis = svg.append('g')
    .attr('class', 'axis x-axis')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x)
      .tickFormat(d3.format('d'))
      .ticks(10));

  xAxis.append('text')
    .attr('class', 'axis-label')
    .attr('x', width / 2)
    .attr('y', 40)
    .attr('text-anchor', 'middle')
    .text('Year');

  // Y axis
  const yAxis = svg.append('g')
    .attr('class', 'axis y-axis')
    .call(d3.axisLeft(y)
      .tickFormat(d => normalized ? d3.format('.0%')(d) : fmtAxisMoney(d))
      .ticks(6));

  yAxis.append('text')
    .attr('class', 'axis-label y-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -60)
    .attr('text-anchor', 'middle')
    .text('Aid Commitment (USD)');

  // Draw areas
  const areas = svg.append('g')
    .attr('class', 'areas')
    .selectAll('path')
    .data(stackedData)
    .join('path')
    .attr('class', 'temporal-area')
    .attr('fill', d => colorScale(d.key))
    .attr('d', area)
    .attr('opacity', 0.85)
    .on('mouseover', function(event, d) {
      d3.select(this).attr('opacity', 1);

      // Highlight this layer
      areas.attr('opacity', layer => layer.key === d.key ? 1 : 0.3);
    })
    .on('mousemove', function(event, d) {
      // Find the year closest to the mouse position
      const [mx] = d3.pointer(event);
      const yearValue = x.invert(mx);
      const nearestYear = Math.round(yearValue);
      const dataPoint = d.find(p => p.data.year === nearestYear);

      if (dataPoint) {
        const value = dataPoint[1] - dataPoint[0];
        const total = purposes.reduce((sum, p) => sum + (dataPoint.data[p] || 0), 0);
        const pct = total > 0 ? (value / total * 100).toFixed(1) : 0;

        tooltip
          .html(`
            <strong>${d.key}</strong><br/>
            Year: ${nearestYear}<br/>
            Amount: $${fmtMoney(value)}<br/>
            Share: ${pct}%
          `)
          .style('opacity', 1)
          .style('left', (event.pageX + 12) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      }
    })
    .on('mouseout', function() {
      areas.attr('opacity', 0.85);
      tooltip.style('opacity', 0);
    });

  // Vertical line for year tracking
  const verticalLine = svg.append('line')
    .attr('class', 'hover-line')
    .attr('y1', 0)
    .attr('y2', height)
    .attr('stroke', '#666')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '4,4')
    .style('opacity', 0);

  // Invisible overlay for year tracking
  svg.append('rect')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', 'transparent')
    .on('mousemove', function(event) {
      const [mx] = d3.pointer(event);
      verticalLine
        .attr('x1', mx)
        .attr('x2', mx)
        .style('opacity', 0.5);
    })
    .on('mouseout', function() {
      verticalLine.style('opacity', 0);
    });

  // Legend
  const legend = d3.select('#temporal-legend').html('');

  purposes.forEach(purpose => {
    const item = legend.append('div')
      .attr('class', 'temporal-legend-item')
      .on('mouseover', function() {
        areas.attr('opacity', layer => layer.key === purpose ? 1 : 0.3);
      })
      .on('mouseout', function() {
        areas.attr('opacity', 0.85);
      });

    item.append('div')
      .attr('class', 'swatch')
      .style('background-color', colorScale(purpose));

    item.append('span')
      .text(purpose.length > 30 ? purpose.substring(0, 27) + '...' : purpose);
  });

  // Normalize toggle
  const normalizeCheckbox = d3.select('#temporal-normalize');

  normalizeCheckbox.on('change', function() {
    normalized = this.checked;

    // Recalculate stack with different offset
    const newStack = d3.stack()
      .keys(purposes)
      .order(d3.stackOrderDescending)
      .offset(normalized ? d3.stackOffsetExpand : d3.stackOffsetNone);

    stackedData = newStack(wideData);

    // Update Y scale
    y.domain([0, normalized ? 1 : d3.max(stackedData, layer => d3.max(layer, d => d[1]))]);

    // Update Y axis
    yAxis.transition().duration(500)
      .call(d3.axisLeft(y)
        .tickFormat(d => normalized ? d3.format('.0%')(d) : fmtAxisMoney(d))
        .ticks(6));

    // Update Y axis label
    yAxis.select('.y-label')
      .text(normalized ? 'Share of Total Aid' : 'Aid Commitment (USD)');

    // Update areas
    areas.data(stackedData)
      .transition().duration(500)
      .attr('d', area);
  });
}
