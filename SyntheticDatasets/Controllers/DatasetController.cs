using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System;

public enum DistributionConfig
{
    Normal,
    Uniform,
    LeftSkew,
    RightSkew,
    Binomial
    
}

public enum Attributes
{
    Age,
    Gender,
    Height,
    Weight,
    Income,
    Race,
    CountryOfBirth
}

public record GenRequest(
    string DatasetName,
    int Rows,
    DistributionConfig DistributionType,
    List<Attributes> IncludedAttributes // list of user attribute options
);


namespace SyntheticDatasets.Controllers
{
    // route reqs to /api/dataset when i make that
    [ApiController]
    [Route("api/[controller]")]
    public class DatasetController: ControllerBase
    {
        [HttpPost("build")]
        public IActionResult BuildDataset([FromBody] GenRequest request)
        {
            return Ok();
        }
    }
}

// need to do input validation for both spelling and ranges
// aspnet core return codes as well to display in console ui
// datacontainer, c# collections
// gen loop for making the rows in the dataset
// fake data gen to populate the rows 
// check data against distribution type