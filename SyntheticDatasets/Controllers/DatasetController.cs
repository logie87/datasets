using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System;
using Microsoft.AspNetCore.Mvc.Routing;

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
    public class DatasetController : ControllerBase
    {
        [HttpPost("build")]
        public IActionResult BuildDataset([FromBody] GenRequest request)
        {
            if (request == null)
            {
                return BadRequest("Request missing values.");
            }
            if (request.Rows == 0 || request.Rows > 1000)
            {
                return BadRequest("Row Count must be in range 0 to 1000");
            }
            if (request.IncludedAttributes.Count == 0)
            {
                return BadRequest("Select attributes before continuing!");
            }
            if (request.DatasetName == null)
            {
                return BadRequest("Please name your dataset");
            }
            if (request.DistributionType == 0)
            {
                return BadRequest("Please select a distribution type.");
            }
            // list of dictionaries to make a table
            var dataset = new List<Dictionary<string, object?>>();
            var random = new Random();
            // user request row generation
            int i = 0;
            while (i < request.Rows)
            {
                var row = new Dictionary<string, object?>();
                int attrI = 0;
                while (attrI < request.IncludedAttributes.Count)
                {
                    Attributes currAttr = request.IncludedAttributes[attrI];
                    object? attrVal = null;
                    switch (currAttr)
                    {
                        // age
                        case Attributes.Age:
                            if (request.DistributionType == DistributionConfig.Uniform)
                            {
                                attrVal = random.Next(1,100); // age gen range
                            }
                            break;
                        // gender 
                        case Attributes.Gender:
                            break;
                        
                        // height
                        case Attributes.Height:
                            break;

                        // weight
                        case Attributes.Weight:
                            break;

                        // income
                        case Attributes.Income:
                            break;

                        // race
                        case Attributes.Race:
                            break;

                        // country of birth
                        case Attributes.CountryOfBirth:
                            break;

                        default:
                            attrVal = "invalid";
                            break;
                    }
                    row.Add(currAttr.ToString(), attrVal); // add to row (dict)
                }
            }

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