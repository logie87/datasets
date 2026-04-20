using Microsoft.AspNetCore.Mvc;
using StatHandler.Services;

namespace StatHandler.Controllers {
    [ApiController]
    [Route("api/[controller]")]
    public class StatController : ControllerBase {
        private readonly StatService _statService;

        // inject statservice: declare & .net links it, like a handler in C
        public StatController(StatService statService) {
            _statService = statService;
        }

        [HttpPost("analyze")]
        public async Task<IActionResult> Analyze(IFormFile file) {
            if (file == null || file.Length == 0)
                return BadRequest("no file provided");

            var result = await _statService.AnalyzeAsync(file);
            return Ok(result);
        }
    }
}