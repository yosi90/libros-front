$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$connectionString = 'Server=YOSI-PC;Database=libros;Integrated Security=True;Encrypt=False;Application Name=Libros Front RTF Read-Only Corpus'
$connection = [System.Data.SqlClient.SqlConnection]::new($connectionString)

try {
    $connection.Open()

    $identityCommand = $connection.CreateCommand()
    $identityCommand.CommandText = "SELECT CONVERT(nvarchar(128), SERVERPROPERTY('MachineName')), DB_NAME()"
    $identityReader = $identityCommand.ExecuteReader()
    if (-not $identityReader.Read()) {
        throw 'No se pudo verificar la identidad de SQL Server.'
    }

    $machineName = $identityReader.GetString(0)
    $databaseName = $identityReader.GetString(1)
    $identityReader.Close()

    if ($machineName -cne 'YOSI-PC' -or $databaseName -cne 'libros') {
        throw "Destino SQL rechazado. Se esperaba YOSI-PC/libros y se obtuvo $machineName/$databaseName."
    }

    $corpusCommand = $connection.CreateCommand()
    $corpusCommand.CommandTimeout = 120
    $corpusCommand.CommandText = @"
SELECT surface, numeric_id, rtf
FROM (
    SELECT
        CAST('escena' AS varchar(8)) AS surface,
        TRY_CONVERT(bigint, id) AS numeric_id,
        descripcion AS rtf
    FROM dbo.escenas
    WHERE LTRIM(descripcion) LIKE '{' + CHAR(92) + 'rtf%'

    UNION ALL

    SELECT
        CAST('entrada' AS varchar(8)) AS surface,
        TRY_CONVERT(bigint, id) AS numeric_id,
        descripcion AS rtf
    FROM dbo.entradas
    WHERE LTRIM(descripcion) LIKE '{' + CHAR(92) + 'rtf%'
) AS corpus
WHERE numeric_id IS NOT NULL
ORDER BY surface, numeric_id
"@

    $reader = $corpusCommand.ExecuteReader([System.Data.CommandBehavior]::SequentialAccess)
    while ($reader.Read()) {
        $surface = $reader.GetString(0)
        $numericId = $reader.GetInt64(1)
        $rtf = $reader.GetString(2)
        $item = [ordered]@{
            id = "${surface}:$numericId"
            surface = $surface
            numericId = $numericId
            rtfBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($rtf))
        }
        [Console]::Out.WriteLine(($item | ConvertTo-Json -Compress))
    }
    $reader.Close()
}
finally {
    if ($connection.State -ne [System.Data.ConnectionState]::Closed) {
        $connection.Close()
    }
    $connection.Dispose()
}
