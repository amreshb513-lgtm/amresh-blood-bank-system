<?php
declare(strict_types=1);

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(int $status, mixed $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function database(): PDO
{
    static $connection = null;
    if ($connection instanceof PDO) {
        return $connection;
    }

    $databaseUrl = getenv('DATABASE_URL');
    if ($databaseUrl !== false && $databaseUrl !== '') {
        $parts = parse_url($databaseUrl);
        if ($parts === false || !isset($parts['host'], $parts['path'])) {
            throw new RuntimeException('Database configuration is invalid');
        }

        $host = $parts['host'];
        $port = $parts['port'] ?? 5432;
        $name = rawurldecode(ltrim($parts['path'], '/'));
        $user = rawurldecode($parts['user'] ?? '');
        $password = rawurldecode($parts['pass'] ?? '');
        $query = [];
        parse_str($parts['query'] ?? '', $query);
        $dsn = "pgsql:host={$host};port={$port};dbname={$name}";
        if (isset($query['sslmode']) && is_string($query['sslmode'])) {
            $dsn .= ";sslmode={$query['sslmode']}";
        }
    } else {
        $host = getenv('PGHOST') ?: 'localhost';
        $port = getenv('PGPORT') ?: '5432';
        $name = getenv('PGDATABASE') ?: '';
        $user = getenv('PGUSER') ?: '';
        $password = getenv('PGPASSWORD') ?: '';
        if ($name === '') {
            throw new RuntimeException('Database configuration is missing');
        }
        $dsn = "pgsql:host={$host};port={$port};dbname={$name}";
    }

    $connection = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $connection;
}

function mapDonor(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'fullName' => $row['fullName'],
        'bloodGroup' => $row['bloodGroup'],
        'city' => $row['city'],
        'state' => $row['state'],
        'pincode' => $row['pincode'] === null ? null : (string) $row['pincode'],
        'phone' => $row['phone'],
        'available' => filter_var($row['available'], FILTER_VALIDATE_BOOLEAN),
        'lastDonationDate' => $row['lastDonationDate'],
        'createdAt' => (new DateTimeImmutable($row['createdAt']))->format(DATE_ATOM),
    ];
}

function validDonationDate(mixed $value): bool
{
    if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
        return false;
    }

    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
    $errors = DateTimeImmutable::getLastErrors();

    return $date !== false
        && ($errors === false || ($errors['warning_count'] === 0 && $errors['error_count'] === 0))
        && $date->format('Y-m-d') === $value
        && $date <= new DateTimeImmutable('today');
}

function listDonors(PDO $db): void
{
    $bloodGroup = $_GET['bloodGroup'] ?? null;
    if ($bloodGroup !== null && (!is_string($bloodGroup) || !in_array($bloodGroup, BLOOD_GROUPS, true))) {
        respond(400, ['error' => 'Choose a valid blood group']);
    }

    $city = trim(is_string($_GET['city'] ?? null) ? $_GET['city'] : '');
    if (mb_strlen($city) > 100) {
        respond(400, ['error' => 'City must be 100 characters or fewer']);
    }

    $available = null;
    if (isset($_GET['available'])) {
        $available = filter_var($_GET['available'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        if ($available === null) {
            respond(400, ['error' => 'Availability filter must be true or false']);
        }
    }

    $limit = filter_var($_GET['limit'] ?? '50', FILTER_VALIDATE_INT);
    if ($limit === false || $limit < 1 || $limit > 100) {
        respond(400, ['error' => 'Limit must be between 1 and 100']);
    }

    $conditions = ['contact_consent = TRUE'];
    $parameters = [];

    if ($bloodGroup !== null) {
        $conditions[] = 'blood_group = :blood_group';
        $parameters['blood_group'] = $bloodGroup;
    }
    if ($city !== '') {
        $conditions[] = 'city ILIKE :city';
        $parameters['city'] = '%' . $city . '%';
    }
    if ($available !== null) {
        $conditions[] = 'available = :available';
        $parameters['available'] = $available;
    }

    $query = 'SELECT id, full_name AS "fullName", blood_group AS "bloodGroup", '
        . 'city, state, pincode, phone, available, '
        . 'last_donation_date::text AS "lastDonationDate", created_at AS "createdAt" '
        . 'FROM blood_donors WHERE ' . implode(' AND ', $conditions)
        . ' ORDER BY available DESC, created_at DESC LIMIT :limit';

    $statement = $db->prepare($query);
    foreach ($parameters as $key => $value) {
        $statement->bindValue(':' . $key, $value, is_bool($value) ? PDO::PARAM_BOOL : PDO::PARAM_STR);
    }
    $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
    $statement->execute();

    respond(200, array_map('mapDonor', $statement->fetchAll()));
}

function registerDonor(PDO $db): void
{
    $input = json_decode(file_get_contents('php://input') ?: '', true);
    if (!is_array($input)) {
        respond(400, ['error' => 'Send donor details as JSON']);
    }

    $fullName = trim(is_string($input['fullName'] ?? null) ? $input['fullName'] : '');
    $bloodGroup = $input['bloodGroup'] ?? null;
    $city = trim(is_string($input['city'] ?? null) ? $input['city'] : '');
    $state = trim(is_string($input['state'] ?? null) ? $input['state'] : '');
    $pincode = trim(is_string($input['pincode'] ?? null) ? $input['pincode'] : '');
    $phone = preg_replace('/\s+/', '', is_string($input['phone'] ?? null) ? $input['phone'] : '');
    $available = $input['available'] ?? true;
    $lastDonationDate = $input['lastDonationDate'] ?? null;

    if (mb_strlen($fullName) < 2 || mb_strlen($fullName) > 100) {
        respond(400, ['error' => 'Name must be between 2 and 100 characters']);
    }
    if (!is_string($bloodGroup) || !in_array($bloodGroup, BLOOD_GROUPS, true)) {
        respond(400, ['error' => 'Choose a valid blood group']);
    }
    if (mb_strlen($city) < 2 || mb_strlen($city) > 100 || mb_strlen($state) < 2 || mb_strlen($state) > 100) {
        respond(400, ['error' => 'Enter a valid city and state']);
    }
    if ($pincode !== '' && !preg_match('/^[0-9]{6}$/', $pincode)) {
        respond(400, ['error' => 'PIN code must contain 6 digits']);
    }
    if (!is_string($phone) || !preg_match('/^[6-9][0-9]{9}$/', $phone)) {
        respond(400, ['error' => 'Enter a valid 10-digit Indian mobile number']);
    }
    if (!is_bool($available)) {
        respond(400, ['error' => 'Availability must be true or false']);
    }
    if ($lastDonationDate !== null && !validDonationDate($lastDonationDate)) {
        respond(400, ['error' => 'Enter a valid past donation date']);
    }
    if (($input['consentToContact'] ?? null) !== true) {
        respond(400, ['error' => 'Consent is required before your phone number is listed']);
    }

    $statement = $db->prepare(
        'INSERT INTO blood_donors '
        . '(full_name, blood_group, city, state, pincode, phone, available, last_donation_date, contact_consent) '
        . 'VALUES (:full_name, :blood_group, :city, :state, :pincode, :phone, :available, :last_donation_date, TRUE) '
        . 'RETURNING id, full_name AS "fullName", blood_group AS "bloodGroup", city, state, pincode, phone, '
        . 'available, last_donation_date::text AS "lastDonationDate", created_at AS "createdAt"'
    );
    $statement->execute([
        'full_name' => $fullName,
        'blood_group' => $bloodGroup,
        'city' => $city,
        'state' => $state,
        'pincode' => $pincode === '' ? null : $pincode,
        'phone' => $phone,
        'available' => $available,
        'last_donation_date' => $lastDonationDate,
    ]);

    respond(201, mapDonor($statement->fetch()));
}

function dashboardSummary(PDO $db): void
{
    $summary = $db->query(
        'SELECT COUNT(*) AS total_donors, '
        . 'COUNT(*) FILTER (WHERE available = TRUE) AS available_donors, '
        . 'COUNT(DISTINCT city) AS cities_covered '
        . 'FROM blood_donors WHERE contact_consent = TRUE'
    )->fetch();

    $groups = $db->query(
        'SELECT blood_group, COUNT(*) AS donor_count FROM blood_donors '
        . 'WHERE contact_consent = TRUE AND available = TRUE '
        . 'GROUP BY blood_group ORDER BY blood_group'
    )->fetchAll();

    respond(200, [
        'totalDonors' => (int) $summary['total_donors'],
        'availableDonors' => (int) $summary['available_donors'],
        'citiesCovered' => (int) $summary['cities_covered'],
        'bloodGroupsRepresented' => count($groups),
        'byBloodGroup' => array_map(
            static fn (array $group): array => [
                'bloodGroup' => $group['blood_group'],
                'count' => (int) $group['donor_count'],
            ],
            $groups
        ),
    ]);
}

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    $db = database();

    if ($path === '/api/donors' && $method === 'GET') {
        listDonors($db);
    }
    if ($path === '/api/donors' && $method === 'POST') {
        registerDonor($db);
    }
    if ($path === '/api/dashboard/summary' && $method === 'GET') {
        dashboardSummary($db);
    }

    respond(404, ['error' => 'Route not found']);
} catch (Throwable $error) {
    error_log('Blood donor API request failed: ' . get_class($error));
    respond(500, ['error' => 'The request could not be completed. Please try again.']);
}