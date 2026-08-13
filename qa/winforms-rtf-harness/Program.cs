using System.Text.Json;

namespace WinformsRtfHarness;

internal static class Program
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    [STAThread]
    private static int Main(string[] args)
    {
        if (args.Length > 0 && string.Equals(args[0], "view", StringComparison.OrdinalIgnoreCase))
            return RunViewer(args);

        return RunJsonLines();
    }

    private static int RunViewer(string[] args)
    {
        if (args.Length != 3 || !File.Exists(args[1]) || !File.Exists(args[2]))
        {
            Console.Error.WriteLine("Uso: WinformsRtfHarness view <izquierda.rtf> <derecha.rtf>");
            return 2;
        }

        ApplicationConfiguration.Initialize();
        Application.Run(new ViewerForm(File.ReadAllText(args[1]), File.ReadAllText(args[2])));
        return 0;
    }

    private static int RunJsonLines()
    {
        using var comparer = new RtfComparer();
        string? line;
        while ((line = Console.ReadLine()) is not null)
        {
            if (string.IsNullOrWhiteSpace(line))
                continue;

            CompareResponse response;
            try
            {
                var request = JsonSerializer.Deserialize<CompareRequest>(line, JsonOptions)
                    ?? throw new InvalidDataException("Solicitud JSON vacia.");
                response = comparer.Compare(request);
            }
            catch (Exception exception) when (exception is JsonException or FormatException or InvalidDataException or ArgumentException)
            {
                response = CompareResponse.Failed("invalid-request", "La solicitud o uno de sus RTF no es valido.");
            }
            catch
            {
                response = CompareResponse.Failed("harness-error", "RichEdit no pudo completar la comparacion.");
            }

            Console.WriteLine(JsonSerializer.Serialize(response, JsonOptions));
            Console.Out.Flush();
        }

        return 0;
    }
}
