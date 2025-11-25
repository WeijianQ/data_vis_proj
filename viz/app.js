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
  let totals, purposes, countryPurposes;
  try {
    [totals, purposes, countryPurposes] = await Promise.all([
      d3.json(totalsPath),
      d3.json(purposesPath),
      d3.json('../data/processed/country_purposes_received.json')
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
  drawScatter(byIso2, earlyNameByIso2, countryPurposes);

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
  drawPurposeMaps(countries, purposes, idByIso2, nameById);
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

function drawScatter(byIso2, nameByIso2, countryPurposes) {
  const el = d3.select('#scatter');
  el.selectAll('*').remove();

  const margin = { top: 20, right: 18, bottom: 40, left: 52 };
  const width = Math.min(1100, el.node().getBoundingClientRect().width || 1100);
  const height = 420;

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

  // Shaded regions above and below y = x line
  // Area above the line (received > donated) - blue shade
  g.append('path')
    .attr('d', `M 0,0 L ${innerW},0 L ${innerW},0 L 0,${innerH} Z`)
    .attr('fill', '#dbeafe')
    .attr('opacity', 0.4);

  // Area below the line (donated > received) - red shade
  g.append('path')
    .attr('d', `M 0,${innerH} L ${innerW},0 L ${innerW},${innerH} Z`)
    .attr('fill', '#fee2e2')
    .attr('opacity', 0.4);

  // y = x reference line
  const diag = d3.line()([[0, innerH], [innerW, 0]]);
  g.append('path')
    .attr('d', diag)
    .attr('stroke', '#495070')
    .attr('stroke-dasharray', '4,4')
    .attr('fill', 'none');

  const tt = d3.select('#tooltip');

  // Create a panel for purpose breakdown
  const breakdownPanel = el.append('div')
    .attr('class', 'purpose-breakdown-panel')
    .style('display', 'none');

  function showPurposeBreakdown(d) {
    const name = nameByIso2.get(d.iso2.toUpperCase()) || d.iso2;
    const purposes = countryPurposes[d.iso2.toUpperCase()] || {};

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

    // Sort purposes by value
    const purposeList = Object.entries(purposes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15); // Show top 15

    if (purposeList.length === 0) {
      breakdownPanel.append('p').text('No purpose data available for this country.');
      return;
    }

    const total = d3.sum(purposeList, d => d[1]);

    // Summary
    breakdownPanel.append('p')
      .attr('class', 'breakdown-summary')
      .html(`Total received: <strong>${fmtMoney(d.received)}</strong> across ${Object.keys(purposes).length} purposes (showing top 15)`);

    // Bar chart
    const barHeight = 28;
    const barMargin = { top: 10, right: 100, bottom: 10, left: 300 };
    const barWidth = 400;
    const chartHeight = purposeList.length * barHeight + barMargin.top + barMargin.bottom;

    const barSvg = breakdownPanel.append('svg')
      .attr('width', barWidth + barMargin.left + barMargin.right)
      .attr('height', chartHeight);

    const barG = barSvg.append('g')
      .attr('transform', `translate(${barMargin.left},${barMargin.top})`);

    const xScale = d3.scaleLinear()
      .domain([0, d3.max(purposeList, d => d[1])])
      .range([0, barWidth]);

    purposeList.forEach(([purpose, value], i) => {
      const row = barG.append('g')
        .attr('transform', `translate(0,${i * barHeight})`);

      // Purpose label (full text)
      row.append('text')
        .attr('x', -8)
        .attr('y', barHeight / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('class', 'purpose-label')
        .text(purpose);

      // Bar
      row.append('rect')
        .attr('x', 0)
        .attr('y', 3)
        .attr('width', xScale(value))
        .attr('height', barHeight - 6)
        .attr('fill', '#2563eb')
        .attr('opacity', 0.7);

      // Value label
      row.append('text')
        .attr('x', xScale(value) + 6)
        .attr('y', barHeight / 2)
        .attr('dominant-baseline', 'middle')
        .attr('class', 'value-label')
        .text(fmtAxisMoney(value));
    });
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
    });
}

function drawNetMap(countries, byIso2, idByIso2, nameById) {
  const el = d3.select('#netmap');
  el.selectAll('*').remove();
  const width = Math.min(1100, el.node().getBoundingClientRect().width || 1100);
  const height = 520;

  const svg = el.append('svg').attr('width', width).attr('height', height);
  const g = svg.append('g');

  const path = d3.geoPath(d3.geoNaturalEarth1().fitSize([width, height], countries));

  // Asymmetric diverging scale: -500B (red) to 0 (white) to 100B (blue)
  const minVal = -500e9; // -500 Billion
  const maxVal = 100e9;   // 100 Billion

  // Custom interpolator: white at 0, blue for positive (recipients), red for negative (donors)
  const customInterpolator = (t) => {
    if (t < 0.5) {
      // Red side (donors): t=0 is darkest red, t=0.5 is white
      const tRed = (0.5 - t) * 2; // 0 to 1
      return d3.interpolateRgb('white', 'rgb(178, 24, 43)')(tRed);
    } else {
      // Blue side (recipients): t=0.5 is white, t=1 is darkest blue
      const tBlue = (t - 0.5) * 2; // 0 to 1
      return d3.interpolateRgb('white', 'rgb(33, 102, 172)')(tBlue);
    }
  };

  const color = d3.scaleDiverging([
    minVal, 0, maxVal
  ], customInterpolator).clamp(true);

  // Build reverse map from feature ID to ISO2 upfront
  const iso2ById = new Map();
  for (const [iso2, fid] of idByIso2.entries()) {
    iso2ById.set(String(fid), iso2);
  }

  const tt = d3.select('#tooltip');

  svg.append('g')
    .selectAll('path')
    .data(countries.features)
    .join('path')
    .attr('class', 'country')
    .attr('d', path)
    .attr('fill', f => {
      const id = String(f.id);
      const iso2 = iso2ById.get(id);
      if (!iso2) return '#e5e7eb';
      const d = byIso2.get(iso2);
      return d ? color(d.net) : '#e5e7eb';
    })
    .on('mousemove', (event, f) => {
      const id = String(f.id);
      const iso2 = iso2ById.get(id);
      const d = iso2 ? byIso2.get(iso2) : null;
      const name = nameById.get(id) || iso2 || 'Unknown';
      const net = d ? d.net : 0;
      const rec = d ? d.received : 0;
      const don = d ? d.donated : 0;
      tt.style('opacity', 1)
        .html(`<strong>${name}</strong><br/>Net: ${fmtMoney(net)}<br/>Received: ${fmtMoney(rec)}<br/>Donated: ${fmtMoney(don)}`)
        .style('left', `${event.clientX + 10}px`)
        .style('top', `${event.clientY + 10}px`);
    })
    .on('mouseleave', () => tt.style('opacity', 0));

  renderDivergingLegend('#legend-diverging', color, width);
}

function drawPurposeMaps(countries, purposesData, idByIso2, nameById) {
  const root = d3.select('#purposes-multiples');
  root.selectAll('*').remove();

  const purposes = purposesData.purposes || [];
  if (purposes.length === 0) return;

  // Create layout: menu on left, map on right
  const container = root.append('div').attr('class', 'purpose-container');

  const menu = container.append('div').attr('class', 'purpose-menu');
  const mapContainer = container.append('div').attr('class', 'purpose-map-container');

  // Build reverse map from feature ID to ISO2 upfront
  const iso2ById = new Map();
  for (const [iso2, fid] of idByIso2.entries()) {
    iso2ById.set(String(fid), iso2);
  }

  const tt = d3.select('#tooltip');

  // Function to draw a single purpose map
  function drawPurposeMap(purpose) {
    mapContainer.selectAll('*').remove();

    const width = Math.min(900, mapContainer.node().getBoundingClientRect().width || 900);
    const height = Math.floor(width * 0.6);

    mapContainer.append('h3').text(purpose).style('margin-bottom', '12px');

    const svg = mapContainer.append('svg').attr('width', width).attr('height', height);
    const path = d3.geoPath(d3.geoNaturalEarth1().fitSize([width, height], countries));

    const recMap = purposesData.per_purpose[purpose] || {};

    // Calculate max value for this specific purpose
    const purposeMaxVal = d3.max(Object.values(recMap)) || 1;
    const color = d3.scaleSequential([0, purposeMaxVal], d3.interpolateBlues);

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
        return val ? color(val) : '#e5e7eb';
      })
      .on('mousemove', (event, f) => {
        const id = String(f.id);
        const iso2 = iso2ById.get(id);
        const name = nameById.get(id) || iso2 || 'Unknown';
        const val = iso2 ? recMap[iso2] : 0;
        tt.style('opacity', 1)
          .html(`<strong>${name}</strong><br/>Received: ${fmtMoney(val || 0)}`)
          .style('left', `${event.clientX + 10}px`)
          .style('top', `${event.clientY + 10}px`);
      })
      .on('mouseleave', () => tt.style('opacity', 0));

    // Update legend with purpose-specific scale
    renderSequentialLegend('#legend-seq', color, Math.min(320, width - 40));
  }

  // Create menu items
  purposes.forEach((purpose, i) => {
    menu.append('div')
      .attr('class', i === 0 ? 'purpose-menu-item active' : 'purpose-menu-item')
      .text(purpose)
      .on('click', function() {
        menu.selectAll('.purpose-menu-item').classed('active', false);
        d3.select(this).classed('active', true);
        drawPurposeMap(purpose);
      });
  });

  // Draw the first purpose by default
  drawPurposeMap(purposes[0]);
}

function renderDivergingLegend(sel, color, width) {
  const w = Math.min(320, width - 40);
  const h = 44;
  const svg = d3.select(sel).html('').append('svg').attr('width', w).attr('height', h);
  const margin = { left: 20, right: 20 };
  const innerW = w - margin.left - margin.right;

  const defs = svg.append('defs');
  const grad = defs.append('linearGradient').attr('id', 'lg-div').attr('x1', '0%').attr('x2', '100%');
  const stops = [0, 0.5, 1].map(t => [t, color(color.domain()[0] + t * (color.domain()[2] - color.domain()[0]))]);
  stops.forEach(([o, c]) => grad.append('stop').attr('offset', o).attr('stop-color', c));

  svg.append('rect')
    .attr('x', margin.left).attr('y', 12)
    .attr('width', innerW).attr('height', 10)
    .attr('fill', 'url(#lg-div)');

  // Custom axis with -500B, 0, and 100B labels
  const scale = d3.scaleLinear().domain([color.domain()[0], color.domain()[2]]).range([margin.left, margin.left + innerW]);
  const axis = d3.axisBottom(scale)
    .tickValues([-500e9, 0, 100e9])
    .tickFormat(d => {
      if (d === 0) return '0';
      if (d === -500e9) return '-500B';
      if (d === 100e9) return '100B';
      return fmtAxisMoney(d);
    });
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${12 + 10})`).call(axis);
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
